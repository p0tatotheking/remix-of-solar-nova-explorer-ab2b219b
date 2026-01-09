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
    const apiKey = Deno.env.get('GIPHY_API_KEY');
    
    if (!apiKey) {
      console.error('GIPHY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Giphy API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine endpoint based on query
    const endpoint = query && query !== 'trending' 
      ? 'search' 
      : 'trending';
    
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      rating: 'g',
    });
    
    if (endpoint === 'search') {
      searchParams.append('q', query);
    }

    const url = `https://api.giphy.com/v1/gifs/${endpoint}?${searchParams.toString()}`;
    console.log('Fetching GIFs from Giphy:', endpoint, query || 'trending');

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Giphy API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GIFs from Giphy' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform the response to a simpler format
    const results = data.data?.map((gif: any) => ({
      id: gif.id,
      url: gif.images?.original?.url || gif.images?.downsized?.url,
      preview: gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url,
      title: gif.title || 'GIF',
    })) || [];

    console.log(`Found ${results.length} GIFs`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in giphy-gifs function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});