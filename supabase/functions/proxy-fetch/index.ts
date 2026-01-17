import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Simple rate limiting using in-memory store
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(clientId);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Blocked domains for security
const blockedDomains = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
];

const blockedPrefixes = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.'];

function isBlockedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    if (blockedDomains.includes(hostname)) return true;
    for (const prefix of blockedPrefixes) {
      if (hostname.startsWith(prefix)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

function getProxyUrl(originalUrl: string, proxyBaseUrl: string): string {
  return `${proxyBaseUrl}?url=${encodeURIComponent(originalUrl)}`;
}

function rewriteHtml(html: string, baseUrl: string, proxyBaseUrl: string): string {
  const base = getBaseUrl(baseUrl);
  
  // Helper to resolve URL
  const resolveUrl = (path: string): string => {
    try {
      if (path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('tel:')) {
        return path;
      }
      return new URL(path, baseUrl).href;
    } catch {
      return path;
    }
  };

  // Helper to proxy URL
  const proxyUrl = (path: string): string => {
    const resolved = resolveUrl(path);
    if (resolved.startsWith('data:') || resolved.startsWith('javascript:') || resolved.startsWith('#') || resolved.startsWith('mailto:') || resolved.startsWith('tel:')) {
      return resolved;
    }
    return getProxyUrl(resolved, proxyBaseUrl);
  };

  // Rewrite src attributes (images, scripts, iframes, etc.)
  html = html.replace(/(src\s*=\s*["'])([^"']+)(["'])/gi, (match, prefix, url, suffix) => {
    const resolved = resolveUrl(url);
    if (resolved.startsWith('data:') || resolved.startsWith('javascript:')) return match;
    return `${prefix}${proxyUrl(url)}${suffix}`;
  });

  // Rewrite href for stylesheets and other resources
  html = html.replace(/<link([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, before, url, after) => {
    const resolved = resolveUrl(url);
    if (resolved.startsWith('data:')) return match;
    return `<link${before}href="${proxyUrl(url)}"${after}>`;
  });

  // Rewrite srcset attributes
  html = html.replace(/srcset\s*=\s*["']([^"']+)["']/gi, (match, srcset) => {
    const newSrcset = srcset.split(',').map((entry: string) => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length >= 1) {
        parts[0] = proxyUrl(parts[0]);
      }
      return parts.join(' ');
    }).join(', ');
    return `srcset="${newSrcset}"`;
  });

  // Rewrite CSS url() functions
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    if (url.startsWith('data:')) return match;
    return `url("${proxyUrl(url)}")`;
  });

  // Rewrite @import statements
  html = html.replace(/@import\s+["']([^"']+)["']/gi, (match, url) => {
    return `@import "${proxyUrl(url)}"`;
  });

  // Rewrite inline style background urls
  html = html.replace(/style\s*=\s*["']([^"']*url\([^)]+\)[^"']*)["']/gi, (match, style) => {
    const newStyle = style.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (m: string, url: string) => {
      if (url.startsWith('data:')) return m;
      return `url("${proxyUrl(url)}")`;
    });
    return `style="${newStyle}"`;
  });

  // Add base tag for any resources we might have missed
  const baseTag = `<base href="${baseUrl}" target="_self">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${baseTag}`);
  } else if (html.includes('<head ')) {
    html = html.replace(/<head\s/, `<head>\n${baseTag}<head `);
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', `<html><head>${baseTag}</head>`);
  } else {
    html = `<head>${baseTag}</head>` + html;
  }

  return html;
}

function rewriteCss(css: string, baseUrl: string, proxyBaseUrl: string): string {
  const resolveUrl = (path: string): string => {
    try {
      if (path.startsWith('data:')) return path;
      return new URL(path, baseUrl).href;
    } catch {
      return path;
    }
  };

  const proxyUrl = (path: string): string => {
    const resolved = resolveUrl(path);
    if (resolved.startsWith('data:')) return resolved;
    return getProxyUrl(resolved, proxyBaseUrl);
  };

  // Rewrite url() functions
  css = css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    if (url.startsWith('data:')) return match;
    return `url("${proxyUrl(url)}")`;
  });

  // Rewrite @import statements
  css = css.replace(/@import\s+["']([^"']+)["']/gi, (match, url) => {
    return `@import "${proxyUrl(url)}"`;
  });

  return css;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim().substring(0, 100) : 'Untitled';
}

function extractFavicon(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    
    // Look for link rel="icon" or rel="shortcut icon"
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*>/i);
    if (iconMatch) {
      const hrefMatch = iconMatch[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        return new URL(hrefMatch[1], base).href;
      }
    }
    
    // Try apple-touch-icon
    const appleIconMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*>/i);
    if (appleIconMatch) {
      const hrefMatch = appleIconMatch[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        return new URL(hrefMatch[1], base).href;
      }
    }
    
    // Default to /favicon.ico
    return new URL('/favicon.ico', base).href;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client ID for rate limiting
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before making more requests.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUrl: string | null = null;
    let responseType: 'json' | 'raw' = 'json';

    // Support both GET (for resources) and POST (for navigation)
    if (req.method === 'GET') {
      targetUrl = url.searchParams.get('url');
      responseType = 'raw';
    } else if (req.method === 'POST') {
      const body = await req.json();
      targetUrl = body.url;
      responseType = body.responseType || 'json';
    }
    
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for blocked domains
    if (isBlockedDomain(targetUrl)) {
      return new Response(
        JSON.stringify({ error: 'Access to this domain is blocked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP and HTTPS protocols are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying: ${targetUrl} (type: ${responseType})`);

    // Fetch the content with browser-like headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Referer': getBaseUrl(targetUrl),
      },
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 304) {
      console.log(`Fetch failed for ${targetUrl}: ${response.status}`);
      if (responseType === 'raw') {
        return new Response(null, { 
          status: response.status, 
          headers: corsHeaders 
        });
      }
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const finalUrl = response.url || targetUrl;
    
    // Build the proxy base URL for rewriting
    const proxyBaseUrl = `${url.origin}${url.pathname}`;

    // For raw response type (GET requests for resources)
    if (responseType === 'raw') {
      // Handle CSS - needs URL rewriting
      if (contentType.includes('text/css')) {
        let css = await response.text();
        css = rewriteCss(css, finalUrl, proxyBaseUrl);
        return new Response(css, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Handle JavaScript - pass through with minimal changes
      if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
        const js = await response.text();
        return new Response(js, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Handle HTML for iframes
      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        let html = await response.text();
        html = rewriteHtml(html, finalUrl, proxyBaseUrl);
        return new Response(html, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      // Handle fonts
      if (contentType.includes('font') || contentType.includes('woff') || contentType.includes('ttf') || contentType.includes('otf')) {
        const fontData = await response.arrayBuffer();
        return new Response(fontData, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Handle images and other binary content
      const data = await response.arrayBuffer();
      return new Response(data, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For JSON response type (POST requests for navigation)
    if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
      let html = await response.text();
      
      // Extract metadata before rewriting
      const title = extractTitle(html);
      const favicon = extractFavicon(html, finalUrl);
      
      // Rewrite HTML with proxied URLs
      html = rewriteHtml(html, finalUrl, proxyBaseUrl);

      return new Response(
        JSON.stringify({
          content: html,
          title,
          favicon,
          finalUrl,
          contentType: 'text/html',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (contentType.includes('application/json')) {
      const json = await response.json();
      return new Response(
        JSON.stringify({
          content: `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 16px; background: #1a1a1a; color: #00ff00;">${JSON.stringify(json, null, 2)}</pre>`,
          title: 'JSON Response',
          favicon: null,
          finalUrl,
          contentType: 'application/json',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (contentType.includes('text/')) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          content: `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 16px; background: #1a1a1a; color: #e0e0e0;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
          title: 'Text Response',
          favicon: null,
          finalUrl,
          contentType: contentType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: `This content type (${contentType}) cannot be displayed in the browser. Try downloading it instead.` 
        }),
        { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Proxy error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch the requested URL';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
