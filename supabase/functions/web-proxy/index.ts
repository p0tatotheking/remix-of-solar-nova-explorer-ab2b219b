import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const TARGET_BASE = 'https://solarnova.online';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/browsing';
    const targetUrl = `${TARGET_BASE}${path}`;
    
    console.log(`Proxying request to: ${targetUrl}`);

    // Fetch the target page
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    
    // For non-HTML content, just pass it through
    if (!contentType.includes('text/html')) {
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
        },
      });
    }

    let html = await response.text();

    // Inject base tag to help with relative URLs
    const baseTag = `<base href="${TARGET_BASE}${path.substring(0, path.lastIndexOf('/') + 1) || '/'}">`;
    
    // Insert base tag after <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
    } else {
      // Prepend if no head tag
      html = `${baseTag}\n${html}`;
    }

    // Rewrite absolute URLs to go through our proxy
    const proxyBase = url.origin + url.pathname;
    
    // Rewrite href and src attributes that start with /
    html = html.replace(/(href|src|action)=(["'])\/(?!\/)/gi, `$1=$2${TARGET_BASE}/`);
    
    // Remove X-Frame-Options meta tags if present
    html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

    console.log('Successfully proxied and processed HTML');

    return new Response(html, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Proxy error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy request', details: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
