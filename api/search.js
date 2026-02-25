export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Get API key from environment variable (stored securely in Vercel)
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'API request failed' });
    }

    // Extract text from response
    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const articles = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ articles });
    } else {
      return res.status(200).json({ articles: [], message: 'No results found' });
    }

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
