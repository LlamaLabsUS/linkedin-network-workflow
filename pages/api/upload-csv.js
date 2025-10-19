import { createClient } from '@supabase/supabase-js';
import { ChromaClient } from 'chromadb';
import Papa from 'papaparse';
import multer from 'multer';
import { promisify } from 'util';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const chroma = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const uploadMiddleware = promisify(upload.single('csvFile'));

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle file upload
    await uploadMiddleware(req, res);

    const { companyName, userId } = req.body;
    const csvFile = req.file;

    if (!csvFile || !companyName || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse CSV
    const csvText = csvFile.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ error: 'CSV parsing failed', details: parseResult.errors });
    }

    const connections = parseResult.data;

    // Create or get company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert({
        name: companyName,
        chroma_collection_name: `${companyName.toLowerCase().replace(/\s+/g, '_')}_linkedin_connections`,
      })
      .select()
      .single();

    if (companyError) {
      throw companyError;
    }

    // Create Chroma collection for company
    try {
      await chroma.createCollection({
        name: company.chroma_collection_name,
        metadata: { company: companyName, type: 'linkedin_connections' }
      });
    } catch (error) {
      // Collection might already exist
      console.log('Collection may already exist:', error.message);
    }

    const collection = await chroma.getCollection({ name: company.chroma_collection_name });

    // Process connections and add to vector database
    const processedConnections = [];
    const documents = [];
    const metadatas = [];
    const ids = [];

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      const vectorId = `${userId}_${i}_${Date.now()}`;

      // Create document text for embedding
      const documentText = `${connection['First Name'] || ''} ${connection['Last Name'] || ''} works at ${connection['Company'] || ''} as ${connection['Position'] || ''}. Email: ${connection['Email Address'] || 'N/A'}. Connected on ${connection['Connected On'] || 'N/A'}.`;

      documents.push(documentText);
      metadatas.push({
        user_id: userId,
        company_id: company.id,
        first_name: connection['First Name'] || '',
        last_name: connection['Last Name'] || '',
        email: connection['Email Address'] || '',
        company: connection['Company'] || '',
        position: connection['Position'] || '',
        connected_on: connection['Connected On'] || '',
        linkedin_url: connection['URL'] || '',
      });
      ids.push(vectorId);

      // Store in database
      processedConnections.push({
        user_id: userId,
        company_id: company.id,
        first_name: connection['First Name'] || '',
        last_name: connection['Last Name'] || '',
        email: connection['Email Address'] || '',
        company: connection['Company'] || '',
        position: connection['Position'] || '',
        connected_on: connection['Connected On'] ? new Date(connection['Connected On']) : null,
        linkedin_url: connection['URL'] || '',
        vector_id: vectorId,
      });
    }

    // Add to Chroma vector database
    await collection.add({
      documents,
      metadatas,
      ids,
    });

    // Store connections in Supabase
    const { error: insertError } = await supabase
      .from('linkedin_connections')
      .insert(processedConnections);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      success: true,
      recordsProcessed: connections.length,
      companyId: company.id,
      collectionName: company.chroma_collection_name,
    });

  } catch (error) {
    console.error('CSV processing error:', error);
    res.status(500).json({ error: 'Failed to process CSV', details: error.message });
  }
}