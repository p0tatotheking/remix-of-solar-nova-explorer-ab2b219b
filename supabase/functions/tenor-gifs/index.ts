import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();
    const apiKey = Deno.env.get('TENOR_API_KEY');
    
    if (!apiKey) {
      console.error('TENOR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Tenor API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine endpoint based on query
    const endpoint = query && query !== 'trending' 
      ? 'search' 
      : 'featured';
    
    const searchParams = new URLSearchParams({
      key: apiKey,
      client_key: 'solarnova_chat',
      limit: String(limit),
      media_filter: 'gif,tinygif',
    });
    
    if (endpoint === 'search') {
      searchParams.append('q', query);
    }

    const url = `https://tenor.googleapis.com/v2/${endpoint}?${searchParams.toString()}`;
    console.log('Fetching GIFs from Tenor:', endpoint, query || 'featured');

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenor API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GIFs from Tenor' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform the response to a simpler format
    const results = data.results?.map((gif: any) => ({
      id: gif.id,
      url: gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url,
      preview: gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url,
      title: gif.title || gif.content_description || 'GIF',
    })) || [];

    console.log(`Found ${results.length} GIFs`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tenor-gifs function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
