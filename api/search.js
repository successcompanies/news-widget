export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        messages: [{
          role: 'user',
          content: `Search for all recent web mentions about "${query}". Find 8-12 results including news articles, social media posts, blog posts, press releases, company announcements, LinkedIn posts, tweets, Facebook posts, YouTube videos, podcast mentions, and any other online mentions. Return ONLY a JSON array with objects containing: title, source (like "Richmond Times-Dispatch" or "LinkedIn" or "Twitter/X" or "Company Blog"), date (formatted like "January 15, 2024"), url, summary (2 sentences max describing the mention). No markdown, no explanation, just the JSON array.`,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'API request failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ articles }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ articles: [], message: 'No results found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Search failed. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
