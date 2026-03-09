import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = 'https://api.github.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const pat = Deno.env.get('GITHUB_PAT');
  if (!pat) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    'Authorization': `token ${pat}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SolarnovaOS-Terminal',
  };

  try {
    const { action, owner, repo, branch, path, content, message, sha } = await req.json();

    if (action === 'clone' || action === 'pull') {
      // Get the default branch if none specified
      let targetBranch = branch || 'main';
      if (!branch) {
        const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
        if (!repoRes.ok) {
          const err = await repoRes.text();
          return new Response(JSON.stringify({ error: `Repository not found: ${err}` }), {
            status: repoRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const repoData = await repoRes.json();
        targetBranch = repoData.default_branch || 'main';
      }

      // Get tree recursively
      const treeRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
        { headers }
      );
      if (!treeRes.ok) {
        const err = await treeRes.text();
        return new Response(JSON.stringify({ error: `Failed to fetch tree: ${err}` }), {
          status: treeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const treeData = await treeRes.json();

      // Filter to blobs only, skip files > 100KB, limit to 200 files
      const blobs = treeData.tree
        .filter((item: any) => item.type === 'blob' && (item.size || 0) < 100000)
        .slice(0, 200);

      // Fetch file contents in batches of 10
      const files: Record<string, string> = {};
      for (let i = 0; i < blobs.length; i += 10) {
        const batch = blobs.slice(i, i + 10);
        const results = await Promise.all(
          batch.map(async (blob: any) => {
            try {
              const blobRes = await fetch(blob.url, { headers });
              if (!blobRes.ok) { await blobRes.text(); return null; }
              const blobData = await blobRes.json();
              if (blobData.encoding === 'base64') {
                const decoded = atob(blobData.content.replace(/\n/g, ''));
                // Skip binary-looking content
                if (decoded.includes('\0')) return null;
                return { path: blob.path, content: decoded };
              }
              return { path: blob.path, content: blobData.content || '' };
            } catch {
              return null;
            }
          })
        );
        for (const r of results) {
          if (r) files[r.path] = r.content;
        }
      }

      return new Response(JSON.stringify({
        files,
        branch: targetBranch,
        truncated: treeData.truncated || blobs.length < treeData.tree.filter((i: any) => i.type === 'blob').length,
        totalFiles: treeData.tree.filter((i: any) => i.type === 'blob').length,
        fetchedFiles: Object.keys(files).length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'push') {
      // Push a single file
      if (!path || content === undefined || !message) {
        return new Response(JSON.stringify({ error: 'path, content, and message are required for push' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body: any = {
        message,
        content: btoa(content),
        branch: branch || 'main',
      };
      if (sha) body.sha = sha;

      const pushRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
        { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const pushData = await pushRes.json();
      if (!pushRes.ok) {
        return new Response(JSON.stringify({ error: `Push failed: ${JSON.stringify(pushData)}` }), {
          status: pushRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        sha: pushData.content?.sha,
        commit: pushData.commit?.sha,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_sha') {
      // Get SHA of a file (needed for updates)
      const shaRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`,
        { headers }
      );
      if (!shaRes.ok) {
        const text = await shaRes.text();
        return new Response(JSON.stringify({ error: text, status: shaRes.status }), {
          status: shaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const shaData = await shaRes.json();
      return new Response(JSON.stringify({ sha: shaData.sha }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
