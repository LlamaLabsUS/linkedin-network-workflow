import { createClient } from '@supabase/supabase-js';
import { ChromaClient } from 'chromadb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const chroma = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, companyName, salesforceUserId } = req.body;

    if (!query || !companyName) {
      return res.status(400).json({ error: 'Query and company name are required' });
    }

    // Get company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', companyName)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Query the vector database
    const collection = await chroma.getCollection({ name: company.chroma_collection_name });
    
    const results = await collection.query({
      queryTexts: [query],
      nResults: 10,
      include: ['documents', 'metadatas', 'distances']
    });

    // Process and format results
    const relevantConnections = [];
    if (results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        const metadata = results.metadatas[0][i];
        const document = results.documents[0][i];
        const distance = results.distances[0][i];

        relevantConnections.push({
          name: `${metadata.first_name} ${metadata.last_name}`,
          company: metadata.company,
          position: metadata.position,
          email: metadata.email,
          linkedin_url: metadata.linkedin_url,
          relevance_score: 1 - distance, // Convert distance to similarity score
          summary: document
        });
      }
    }

    // Generate AI response based on retrieved connections
    const aiResponse = generateAIResponse(query, relevantConnections);

    // Log the query for Salesforce integration
    const { error: logError } = await supabase
      .from('salesforce_queries')
      .insert({
        company_id: company.id,
        query_text: query,
        response_text: aiResponse,
        salesforce_user_id: salesforceUserId || null,
      });

    if (logError) {
      console.error('Failed to log query:', logError);
    }

    res.status(200).json({
      success: true,
      query,
      response: aiResponse,
      connections: relevantConnections,
      total_results: relevantConnections.length
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ error: 'Failed to process query', details: error.message });
  }
}

function generateAIResponse(query, connections) {
  if (connections.length === 0) {
    return `I couldn't find any relevant connections for "${query}". Please try a different search term or check if the LinkedIn connections have been properly uploaded.`;
  }

  let response = `Based on your LinkedIn network, I found ${connections.length} relevant connections for "${query}":\n\n`;

  connections.slice(0, 5).forEach((conn, index) => {
    response += `${index + 1}. **${conn.name}** - ${conn.position} at ${conn.company}\n`;
    if (conn.email && conn.email !== 'N/A') {
      response += `   Email: ${conn.email}\n`;
    }
    if (conn.linkedin_url) {
      response += `   LinkedIn: ${conn.linkedin_url}\n`;
    }
    response += `   Relevance: ${(conn.relevance_score * 100).toFixed(1)}%\n\n`;
  });

  if (connections.length > 5) {
    response += `... and ${connections.length - 5} more connections.\n\n`;
  }

  // Add contextual insights
  const companies = [...new Set(connections.map(c => c.company))];
  const positions = [...new Set(connections.map(c => c.position))];

  response += `**Key Insights:**\n`;
  response += `- Companies represented: ${companies.slice(0, 5).join(', ')}${companies.length > 5 ? ` and ${companies.length - 5} more` : ''}\n`;
  response += `- Common positions: ${positions.slice(0, 3).join(', ')}${positions.length > 3 ? ` and others` : ''}\n`;

  return response;
}