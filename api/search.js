export default async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = request.body;

  if (!query) {
    return response.status(400).json({ error: 'Query is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search'
        }],
        messages: [{
          role: 'user',
          content: `Search for all recent web mentions about "${query}". Find 8-12 results including news articles, social media posts, blog posts, press releases, company announcements, LinkedIn posts, tweets, Facebook posts, YouTube videos, podcast mentions, and any other online mentions. Return ONLY a JSON array with objects containing: title, source (like "Richmond Times-Dispatch" or "LinkedIn" or "Twitter/X" or "Company Blog"), date (formatted like "January 15, 2024"), url, summary (2 sentences max describing the mention). No markdown, no explanation, just the JSON array.`
        }]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', data);
      return response.status(anthropicResponse.status).json({ 
        error: data.error?.message || 'API request failed',
        details: data
      });
    }

    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const articles = JSON.parse(jsonMatch[0]);
      return response.status(200).json({ articles });
    } else {
      return response.status(200).json({ articles: [], message: 'No results found' });
    }

  } catch (error) {
    console.error('Search error:', error);
    return response.status(500).json({ error: 'Search failed: ' + error.message });
  }
}
