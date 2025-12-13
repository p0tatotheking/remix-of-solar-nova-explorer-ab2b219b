import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JAMENDO_CLIENT_ID = 'e9b32f1a';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let action = 'popular';
    let query = '';

    // Try to parse body if present
    try {
      const body = await req.json();
      if (body?.action) action = body.action;
      if (body?.query) query = body.query;
    } catch {
      // No body or invalid JSON, use defaults
    }

    let apiUrl = '';

    if (action === 'search' && query) {
      apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=50&search=${encodeURIComponent(query)}&include=musicinfo`;
    } else {
      apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=50&order=popularity_total&include=musicinfo`;
    }

    console.log('Fetching from Jamendo:', apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log('Jamendo response status:', response.status);
    console.log('Tracks found:', data.results?.length || 0);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in music-api function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage, results: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
