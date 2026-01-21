import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting using in-memory store
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50; // requests per window
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
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
];

function isBlockedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    return blockedDomains.some(blocked => hostname.includes(blocked));
  } catch {
    return true;
  }
}

function rewriteUrls(html: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    
    // Rewrite relative URLs to absolute
    html = html.replace(/(href|src|action)=["'](?!https?:\/\/|data:|javascript:|#|mailto:|tel:)([^"']+)/gi, (match, attr, path) => {
      try {
        const absoluteUrl = new URL(path, base).href;
        return `${attr}="${absoluteUrl}"`;
      } catch {
        return match;
      }
    });
    
    // Rewrite url() in CSS
    html = html.replace(/url\(['"]?(?!https?:\/\/|data:)([^"')]+)['"]?\)/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, base).href;
        return `url("${absoluteUrl}")`;
      } catch {
        return match;
      }
    });
    
    return html;
  } catch {
    return html;
  }
}

function sanitizeHtml(html: string): string {
  // Remove potentially dangerous elements and attributes
  // This is a basic sanitization - for production, consider using a proper library
  
  // Remove script tags (but keep noscript)
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  return html;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Untitled';
}

function extractFavicon(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    
    // Look for link rel="icon" or rel="shortcut icon"
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i);
    if (iconMatch) {
      const hrefMatch = iconMatch[0].match(/href=["']([^"']+)["']/i);
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client ID for rate limiting (use IP or a header)
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before making more requests.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for blocked domains
    if (isBlockedDomain(url)) {
      return new Response(
        JSON.stringify({ error: 'Access to this domain is blocked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP and HTTPS protocols are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching URL: ${url}`);

    // Fetch the content with more realistic browser headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // Some sites return 403 for server requests - provide a helpful message
      if (response.status === 403) {
        console.log(`403 Forbidden from ${url} - site may be blocking server requests`);
        return new Response(
          JSON.stringify({ 
            error: 'This website blocks server requests. Try a different site.',
            blocked: true 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types
    if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
      let html = await response.text();
      
      // Rewrite URLs to absolute
      html = rewriteUrls(html, response.url);
      
      // Sanitize HTML
      html = sanitizeHtml(html);
      
      // Extract metadata
      const title = extractTitle(html);
      const favicon = extractFavicon(html, response.url);
      
      // Inject base tag for relative resources
      const baseTag = `<base href="${response.url}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head\s+/, `<head>${baseTag}<head `);
      } else {
        html = baseTag + html;
      }

      return new Response(
        JSON.stringify({
          content: html,
          title,
          favicon,
          finalUrl: response.url,
          contentType: 'text/html',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (contentType.includes('application/json')) {
      const json = await response.json();
      return new Response(
        JSON.stringify({
          content: JSON.stringify(json, null, 2),
          title: 'JSON Response',
          favicon: null,
          finalUrl: response.url,
          contentType: 'application/json',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (contentType.includes('text/')) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          content: `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 16px;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
          title: 'Text Response',
          favicon: null,
          finalUrl: response.url,
          contentType: contentType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // For binary content, return an error (we can't display it safely)
      return new Response(
        JSON.stringify({ error: `Unsupported content type: ${contentType}` }),
        { status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Proxy fetch error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch the requested URL';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
