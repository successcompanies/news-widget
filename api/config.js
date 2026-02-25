export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  
  return response.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  });
}
