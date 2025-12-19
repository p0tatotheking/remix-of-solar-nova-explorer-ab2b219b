import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple ZIP local file header parsing - no external library needed
// This processes files one at a time to avoid memory issues
async function* extractZipFiles(zipBuffer: Uint8Array): AsyncGenerator<{ filename: string; content: Uint8Array }> {
  const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);
  let offset = 0;

  while (offset < zipBuffer.length - 4) {
    const signature = view.getUint32(offset, true);
    
    // Local file header signature
    if (signature !== 0x04034b50) break;
    
    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const filenameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);
    
    const filenameStart = offset + 30;
    const filename = new TextDecoder().decode(zipBuffer.slice(filenameStart, filenameStart + filenameLength));
    
    const dataStart = filenameStart + filenameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;
    
    // Only process uncompressed files (method 0) or small compressed files
    if (compressionMethod === 0 && !filename.endsWith('/')) {
      const content = zipBuffer.slice(dataStart, dataEnd);
      yield { filename, content };
    }
    
    offset = dataEnd;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const zipFile = formData.get('file') as File;
    const adminId = formData.get('adminId') as string;
    const genre = formData.get('genre') as string || 'Other';

    if (!zipFile || !adminId) {
      return new Response(JSON.stringify({ error: 'Missing file or adminId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit file size to 50MB to prevent memory issues
    if (zipFile.size > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'ZIP file too large. Maximum 50MB allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing zip file:', zipFile.name, 'Size:', zipFile.size);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Read zip as buffer
    const zipBuffer = new Uint8Array(await zipFile.arrayBuffer());
    
    const uploadedTracks: string[] = [];
    const errors: string[] = [];

    // Process each file from the zip
    for await (const { filename, content } of extractZipFiles(zipBuffer)) {
      // Only process MP3 files
      if (!filename.toLowerCase().endsWith('.mp3')) {
        console.log('Skipping non-MP3 file:', filename);
        continue;
      }

      try {
        const cleanFilename = filename.split('/').pop() || filename;
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${cleanFilename}`;

        console.log('Uploading:', cleanFilename);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('music')
          .upload(uniqueFilename, content, {
            contentType: 'audio/mpeg',
          });

        if (uploadError) {
          console.error('Upload error for', cleanFilename, ':', uploadError);
          errors.push(`Failed to upload ${cleanFilename}`);
          continue;
        }

        // Extract title from filename
        const title = cleanFilename.replace(/\.mp3$/i, '').replace(/[-_]/g, ' ');

        // Add to database
        const { error: dbError } = await supabase
          .from('uploaded_music')
          .insert({
            title,
            artist: 'Unknown Artist',
            file_path: uniqueFilename,
            uploaded_by: adminId,
            genre,
          });

        if (dbError) {
          console.error('Database error for', cleanFilename, ':', dbError);
          await supabase.storage.from('music').remove([uniqueFilename]);
          errors.push(`Failed to save metadata for ${cleanFilename}`);
          continue;
        }

        uploadedTracks.push(title);
        console.log('Successfully uploaded:', title);
      } catch (err) {
        console.error('Error processing', filename, ':', err);
        errors.push(`Error processing ${filename}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      uploaded: uploadedTracks,
      errors,
      message: `Uploaded ${uploadedTracks.length} tracks`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-zip function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
