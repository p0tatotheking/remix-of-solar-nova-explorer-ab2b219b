import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, artist } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    const searchTerm = artist ? `${title} ${artist}` : title;
    const encodedTerm = encodeURIComponent(searchTerm);
    
    console.log(`Searching iTunes for: ${searchTerm}`);
    
    // Search iTunes API
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodedTerm}&media=music&entity=song&limit=5`
    );

    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.resultCount > 0) {
      // Get the best match and return higher resolution artwork
      const result = data.results[0];
      // Replace 100x100 with 600x600 for better quality
      const artworkUrl = result.artworkUrl100?.replace('100x100', '600x600') || null;
      
      console.log(`Found artwork: ${artworkUrl}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          thumbnail: artworkUrl,
          trackName: result.trackName,
          artistName: result.artistName,
          albumName: result.collectionName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No results found
    return new Response(
      JSON.stringify({ success: true, thumbnail: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('iTunes search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
