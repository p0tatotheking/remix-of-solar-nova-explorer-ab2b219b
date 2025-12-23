import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch cover art from iTunes Search API
async function fetchCoverArt(title: string, artist: string): Promise<string | null> {
  try {
    const searchQuery = encodeURIComponent(`${artist} ${title}`.replace(/[^\w\s]/g, ' ').trim());
    const url = `https://itunes.apple.com/search?term=${searchQuery}&media=music&entity=song&limit=5`;
    
    console.log('Searching iTunes for:', searchQuery);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const artworkUrl = data.results[0].artworkUrl100;
      if (artworkUrl) {
        return artworkUrl.replace('100x100', '600x600');
      }
    }

    // Try title-only search
    const titleOnlyQuery = encodeURIComponent(title.replace(/[^\w\s]/g, ' ').trim());
    const titleOnlyUrl = `https://itunes.apple.com/search?term=${titleOnlyQuery}&media=music&entity=song&limit=3`;
    
    const titleResponse = await fetch(titleOnlyUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      if (titleData.results && titleData.results.length > 0) {
        const artworkUrl = titleData.results[0].artworkUrl100;
        if (artworkUrl) {
          return artworkUrl.replace('100x100', '600x600');
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Cover art fetch error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: adminId,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get songs without covers
    const { data: songs, error } = await supabase
      .from('uploaded_music')
      .select('id, title, artist')
      .is('cover_url', null);

    if (error) throw error;

    console.log(`Found ${songs?.length || 0} songs without covers`);

    let updatedCount = 0;

    for (const song of songs || []) {
      const coverUrl = await fetchCoverArt(song.title, song.artist);
      
      if (coverUrl) {
        const { error: updateError } = await supabase
          .from('uploaded_music')
          .update({ cover_url: coverUrl })
          .eq('id', song.id);

        if (!updateError) {
          updatedCount++;
          console.log(`Updated cover for: ${song.title}`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return new Response(JSON.stringify({
      success: true,
      total: songs?.length || 0,
      updated: updatedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
