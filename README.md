# LinkedIn Network Workflow App

A comprehensive workflow application that allows users to:
1. **Login with LinkedIn credentials**
2. **Export LinkedIn network connections to CSV**
3. **Upload CSV to RAG vector database** (organized by company)
4. **AI agent queries** the company's network database
5. **Salesforce CRM integration** for contextual information retrieval

## 🚀 Features

- **LinkedIn OAuth Authentication**
- **CSV Upload & Processing** 
- **Vector Database Storage** (Chroma)
- **AI-Powered Network Queries**
- **Salesforce CRM Integration**
- **Company-based Data Organization**
- **Real-time Query Processing**

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Vector Database**: ChromaDB
- **Authentication**: LinkedIn OAuth
- **CRM Integration**: Salesforce API

## 📋 Prerequisites

- Node.js 18+ 
- LinkedIn Developer Account
- Supabase Account
- ChromaDB instance
- Salesforce Developer Account (optional)

## 🔧 Setup Instructions

### 1. Clone Repository
\`\`\`bash
git clone https://github.com/LlamaLabsUS/linkedin-network-workflow.git
cd linkedin-network-workflow
npm install
\`\`\`

### 2. Environment Configuration
Copy \`.env.example\` to \`.env.local\` and configure:

\`\`\`bash
cp .env.example .env.local
\`\`\`

### 3. LinkedIn OAuth Setup
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create new app
3. Add redirect URI: \`http://localhost:3000/api/auth/linkedin/callback\`
4. Copy Client ID and Secret to \`.env.local\`

### 4. Supabase Setup
1. Create new Supabase project
2. Run the database migration:

\`\`\`sql
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkedin_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    company_name VARCHAR NOT NULL,
    linkedin_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR UNIQUE NOT NULL,
    chroma_collection_name VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create linkedin_connections table
CREATE TABLE linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    company VARCHAR,
    position VARCHAR,
    connected_on DATE,
    linkedin_url VARCHAR,
    vector_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create salesforce_queries table
CREATE TABLE salesforce_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    response_text TEXT,
    salesforce_user_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

### 5. ChromaDB Setup
\`\`\`bash
# Install ChromaDB
pip install chromadb

# Run ChromaDB server
chroma run --host localhost --port 8000
\`\`\`

### 6. Run Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:3000\`

## 📱 Usage Workflow

### For End Users:
1. **Login** with LinkedIn credentials
2. **Enter company name**
3. **Upload LinkedIn connections CSV**
4. **System processes** and stores in vector database

### For Salesforce Users:
1. **Query the network** via API endpoint
2. **Receive contextual information** about connections
3. **Get recommendations** for warm introductions

## 🔌 API Endpoints

### Authentication
- \`GET /api/auth/linkedin/callback\` - LinkedIn OAuth callback

### Data Management  
- \`POST /api/upload-csv\` - Upload and process LinkedIn CSV
- \`POST /api/query-network\` - Query network connections

### CRM Integration
- \`POST /api/salesforce-integration\` - Salesforce CRM queries

## 📊 Salesforce Integration

### Query Example:
\`\`\`javascript
POST /api/salesforce-integration
{
  "query": "software engineers at tech companies",
  "companyName": "Product Labs",
  "salesforceUserId": "005xx000001234567",
  "leadId": "00Qxx000001234567"
}
\`\`\`

### Response Format:
\`\`\`javascript
{
  "success": true,
  "data": {
    "network_insights": {
      "total_connections_found": 15,
      "top_connections": [...],
      "recommendations": [...]
    }
  }
}
\`\`\`

## 🚀 Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically

### Environment Variables for Production:
- Update \`NEXTAUTH_URL\` to production domain
- Configure production database URLs
- Set up production ChromaDB instance

## 🔒 Security Features

- **Row Level Security** on Supabase tables
- **OAuth authentication** with LinkedIn
- **API rate limiting** 
- **Input validation** and sanitization
- **Secure file upload** handling

## 📈 Scalability Considerations

- **Vector database sharding** by company
- **Caching layer** for frequent queries  
- **Background job processing** for large CSV files
- **API pagination** for large result sets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create GitHub issue
- Contact: dev@productlabs.us

---

**Built with ❤️ by Product Labs**