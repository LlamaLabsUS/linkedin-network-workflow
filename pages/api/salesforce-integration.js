import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      query, 
      companyName, 
      salesforceUserId, 
      salesforceOrgId,
      leadId,
      opportunityId 
    } = req.body;

    if (!query || !companyName || !salesforceUserId) {
      return res.status(400).json({ 
        error: 'Query, company name, and Salesforce user ID are required' 
      });
    }

    // Query the network using our existing API
    const networkResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/query-network`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        companyName,
        salesforceUserId
      }),
    });

    const networkData = await networkResponse.json();

    if (!networkData.success) {
      throw new Error(networkData.error);
    }

    // Format response for Salesforce CRM
    const salesforceResponse = {
      query: query,
      timestamp: new Date().toISOString(),
      salesforce_user_id: salesforceUserId,
      salesforce_org_id: salesforceOrgId,
      lead_id: leadId,
      opportunity_id: opportunityId,
      network_insights: {
        total_connections_found: networkData.total_results,
        top_connections: networkData.connections.slice(0, 5).map(conn => ({
          name: conn.name,
          company: conn.company,
          position: conn.position,
          email: conn.email,
          linkedin_profile: conn.linkedin_url,
          relevance_score: conn.relevance_score,
          potential_intro: conn.relevance_score > 0.7 ? 'High' : conn.relevance_score > 0.5 ? 'Medium' : 'Low'
        })),
        summary: networkData.response,
        recommendations: generateSalesforceRecommendations(networkData.connections, query)
      }
    };

    // Store Salesforce-specific query log
    const { error: logError } = await supabase
      .from('salesforce_queries')
      .insert({
        company_id: networkData.company_id,
        query_text: query,
        response_text: JSON.stringify(salesforceResponse),
        salesforce_user_id: salesforceUserId,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Failed to log Salesforce query:', logError);
    }

    res.status(200).json({
      success: true,
      data: salesforceResponse
    });

  } catch (error) {
    console.error('Salesforce integration error:', error);
    res.status(500).json({ 
      error: 'Failed to process Salesforce query', 
      details: error.message 
    });
  }
}

function generateSalesforceRecommendations(connections, query) {
  const recommendations = [];

  if (connections.length === 0) {
    recommendations.push({
      type: 'no_connections',
      message: 'No relevant connections found. Consider expanding search terms or uploading more LinkedIn connections.',
      priority: 'low'
    });
    return recommendations;
  }

  // High relevance connections
  const highRelevanceConnections = connections.filter(c => c.relevance_score > 0.7);
  if (highRelevanceConnections.length > 0) {
    recommendations.push({
      type: 'warm_introduction',
      message: `${highRelevanceConnections.length} high-relevance connections found. Consider requesting warm introductions.`,
      connections: highRelevanceConnections.slice(0, 3).map(c => c.name),
      priority: 'high'
    });
  }

  // Company clustering
  const companyGroups = {};
  connections.forEach(conn => {
    if (!companyGroups[conn.company]) {
      companyGroups[conn.company] = [];
    }
    companyGroups[conn.company].push(conn);
  });

  const multipleConnectionCompanies = Object.entries(companyGroups)
    .filter(([company, conns]) => conns.length > 1)
    .sort(([,a], [,b]) => b.length - a.length);

  if (multipleConnectionCompanies.length > 0) {
    recommendations.push({
      type: 'company_cluster',
      message: `Multiple connections found at ${multipleConnectionCompanies[0][0]} (${multipleConnectionCompanies[0][1].length} connections). Strong potential for account penetration.`,
      company: multipleConnectionCompanies[0][0],
      connection_count: multipleConnectionCompanies[0][1].length,
      priority: 'medium'
    });
  }

  // Decision maker identification
  const decisionMakers = connections.filter(c => 
    c.position.toLowerCase().includes('ceo') ||
    c.position.toLowerCase().includes('cto') ||
    c.position.toLowerCase().includes('vp') ||
    c.position.toLowerCase().includes('director') ||
    c.position.toLowerCase().includes('head of')
  );

  if (decisionMakers.length > 0) {
    recommendations.push({
      type: 'decision_makers',
      message: `${decisionMakers.length} potential decision makers identified in your network.`,
      decision_makers: decisionMakers.slice(0, 3).map(dm => ({
        name: dm.name,
        position: dm.position,
        company: dm.company
      })),
      priority: 'high'
    });
  }

  return recommendations;
}