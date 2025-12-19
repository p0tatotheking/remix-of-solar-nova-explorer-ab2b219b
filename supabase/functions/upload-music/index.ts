import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use AI to extract artist and genre from filename
async function analyzeMusic(filename: string, apiKey: string): Promise<{ artist: string; genre: string }> {
  try {
    const prompt = `Analyze this music filename and extract the artist name and music genre.
Filename: "${filename}"

Common patterns:
- "Artist - Song Title.mp3"
- "Artist_Song_Title.mp3" 
- "Song Title (Artist).mp3"
- Just a song title

Respond with a JSON object only, no explanation:
{"artist": "Artist Name", "genre": "Genre"}

If you can't determine the artist, use "Unknown Artist".
For genre, choose from: Hip-Hop, R&B, Pop, Rock, Electronic, Jazz, Classical, Country, Latin, Other

JSON response:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return { artist: 'Unknown Artist', genre: 'Other' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        artist: parsed.artist || 'Unknown Artist',
        genre: parsed.genre || 'Other',
      };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }
  
  return { artist: 'Unknown Artist', genre: 'Other' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const adminId = formData.get('adminId') as string;
    const manualGenre = formData.get('genre') as string;

    if (!file || !adminId) {
      return new Response(JSON.stringify({ error: 'Missing file or adminId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return new Response(JSON.stringify({ error: 'Only MP3 files are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit file size to 20MB
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 20MB allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing MP3 file:', file.name, 'Size:', file.size);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: adminId,
      _role: 'admin',
    });

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to analyze the filename for artist and genre
    const cleanFilename = file.name.replace(/\.mp3$/i, '');
    const { artist, genre: aiGenre } = await analyzeMusic(cleanFilename, lovableApiKey);
    
    // Use manual genre if provided, otherwise use AI-detected genre
    const finalGenre = manualGenre && manualGenre !== 'Other' && manualGenre !== 'All' ? manualGenre : aiGenre;

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

    // Read file content
    const fileBuffer = new Uint8Array(await file.arrayBuffer());

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('music')
      .upload(uniqueFilename, fileBuffer, {
        contentType: 'audio/mpeg',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract title (remove artist prefix if present)
    let title = cleanFilename;
    if (artist !== 'Unknown Artist' && cleanFilename.toLowerCase().includes(artist.toLowerCase())) {
      // Try to extract just the song title
      const patterns = [
        new RegExp(`^${artist}\\s*[-–—]\\s*`, 'i'),
        new RegExp(`\\s*[-–—]\\s*${artist}$`, 'i'),
        new RegExp(`^${artist}\\s*_\\s*`, 'i'),
      ];
      for (const pattern of patterns) {
        const cleaned = cleanFilename.replace(pattern, '');
        if (cleaned !== cleanFilename) {
          title = cleaned;
          break;
        }
      }
    }
    
    // Clean up title
    title = title.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    // Add to database
    const { data: musicData, error: dbError } = await supabase
      .from('uploaded_music')
      .insert({
        title,
        artist,
        file_path: uniqueFilename,
        uploaded_by: adminId,
        genre: finalGenre,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      await supabase.storage.from('music').remove([uniqueFilename]);
      return new Response(JSON.stringify({ error: 'Failed to save metadata' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully uploaded:', title, 'by', artist, 'Genre:', finalGenre);

    return new Response(JSON.stringify({
      success: true,
      track: {
        id: musicData.id,
        title,
        artist,
        genre: finalGenre,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in upload-music function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
