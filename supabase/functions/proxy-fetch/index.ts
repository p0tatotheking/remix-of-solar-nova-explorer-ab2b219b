import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 200;
const RATE_WINDOW = 60000;

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

// Blocked domains
const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];

function isBlocked(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedPatterns.some(p => hostname.includes(p) || hostname.startsWith(p));
  } catch {
    return true;
  }
}

function getProxyPrefix(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}${url.pathname}?url=`;
}

function resolveUrl(path: string, base: string): string {
  if (!path || path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('tel:') || path.startsWith('blob:')) {
    return path;
  }
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

function shouldProxy(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function rewriteHtml(html: string, baseUrl: string, proxyPrefix: string): string {
  // Helper to create proxied URL
  const proxy = (url: string): string => {
    const resolved = resolveUrl(url, baseUrl);
    if (!shouldProxy(resolved)) return resolved;
    return proxyPrefix + encodeURIComponent(resolved);
  };

  // Inject base tag first
  const baseTag = `<base href="${baseUrl}">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}`);
  } else if (html.includes('<head ')) {
    html = html.replace(/<head\s/, `<head>${baseTag}<head `);
  } else if (html.includes('<html')) {
    html = html.replace(/<html[^>]*>/, `$&<head>${baseTag}</head>`);
  }

  // Rewrite src attributes for img, script, iframe, video, audio, source, embed
  html = html.replace(/<(img|script|iframe|video|audio|source|embed|input)([^>]*)\s(src)\s*=\s*["']([^"']+)["']/gi, 
    (match, tag, before, attr, url) => {
      const proxied = proxy(url);
      return `<${tag}${before} ${attr}="${proxied}"`;
    }
  );

  // Also handle src without quotes
  html = html.replace(/<(img|script|iframe|video|audio|source|embed)([^>]*)\ssrc\s*=\s*([^\s>"']+)/gi,
    (match, tag, before, url) => {
      if (url.startsWith('"') || url.startsWith("'")) return match;
      const proxied = proxy(url);
      return `<${tag}${before} src="${proxied}"`;
    }
  );

  // Rewrite href for link tags (stylesheets)
  html = html.replace(/<link([^>]*)\shref\s*=\s*["']([^"']+)["']/gi,
    (match, attrs, url) => {
      const proxied = proxy(url);
      return `<link${attrs} href="${proxied}"`;
    }
  );

  // Rewrite srcset
  html = html.replace(/srcset\s*=\s*["']([^"']+)["']/gi, (match, srcset) => {
    const parts = srcset.split(',').map((part: string) => {
      const trimmed = part.trim();
      const spaceIdx = trimmed.lastIndexOf(' ');
      if (spaceIdx > 0) {
        const url = trimmed.substring(0, spaceIdx).trim();
        const descriptor = trimmed.substring(spaceIdx).trim();
        return `${proxy(url)} ${descriptor}`;
      }
      return proxy(trimmed);
    });
    return `srcset="${parts.join(', ')}"`;
  });

  // Rewrite poster attribute for video
  html = html.replace(/poster\s*=\s*["']([^"']+)["']/gi, (match, url) => {
    return `poster="${proxy(url)}"`;
  });

  // Rewrite url() in style attributes and style tags
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    if (url.startsWith('data:')) return match;
    return `url("${proxy(url)}")`;
  });

  // Rewrite @import in style tags
  html = html.replace(/@import\s+["']([^"']+)["']/gi, (match, url) => {
    return `@import "${proxy(url)}"`;
  });

  // Rewrite @import url()
  html = html.replace(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    return `@import url("${proxy(url)}")`;
  });

  // Rewrite action in forms
  html = html.replace(/<form([^>]*)\saction\s*=\s*["']([^"']+)["']/gi,
    (match, attrs, url) => {
      const proxied = proxy(url);
      return `<form${attrs} action="${proxied}"`;
    }
  );

  // Add a script to intercept navigation
  const navigationScript = `
<script>
(function() {
  const PROXY_PREFIX = "${proxyPrefix}";
  const BASE_URL = "${baseUrl}";
  
  function proxyUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }
    try {
      const absolute = new URL(url, BASE_URL).href;
      if (absolute.includes('/proxy-fetch?url=')) return url;
      return PROXY_PREFIX + encodeURIComponent(absolute);
    } catch (e) {
      return url;
    }
  }
  
  // Intercept clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const absolute = new URL(href, BASE_URL).href;
          window.parent.postMessage({ type: 'proxy-navigate', url: absolute }, '*');
        } catch (err) {
          window.parent.postMessage({ type: 'proxy-navigate', url: href }, '*');
        }
      }
    }
  }, true);
  
  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form && form.tagName === 'FORM') {
      e.preventDefault();
      const action = form.getAttribute('action') || BASE_URL;
      const method = (form.getAttribute('method') || 'GET').toUpperCase();
      
      try {
        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData) {
          if (typeof value === 'string') params.append(key, value);
        }
        
        let targetUrl;
        if (method === 'GET') {
          const url = new URL(action, BASE_URL);
          params.forEach((value, key) => url.searchParams.append(key, value));
          targetUrl = url.href;
        } else {
          targetUrl = new URL(action, BASE_URL).href;
        }
        
        window.parent.postMessage({ type: 'proxy-navigate', url: targetUrl }, '*');
      } catch (err) {
        console.error('Form error:', err);
      }
    }
  }, true);
  
  // Fix lazy-loaded images
  document.querySelectorAll('img[data-src], img[data-lazy-src]').forEach(function(img) {
    ['data-src', 'data-lazy-src', 'data-original'].forEach(function(attr) {
      const val = img.getAttribute(attr);
      if (val && !val.startsWith('data:')) {
        img.setAttribute(attr, proxyUrl(val));
      }
    });
  });
  
  // Observe DOM for new elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mut) {
      mut.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          // Images
          if (node.tagName === 'IMG' || node.querySelectorAll) {
            const imgs = node.tagName === 'IMG' ? [node] : Array.from(node.querySelectorAll('img'));
            imgs.forEach(function(img) {
              const src = img.getAttribute('src');
              if (src && !src.startsWith('data:') && !src.includes('/proxy-fetch?url=')) {
                img.src = proxyUrl(src);
              }
            });
          }
          // Stylesheets
          if (node.tagName === 'LINK') {
            const href = node.getAttribute('href');
            if (href && !href.includes('/proxy-fetch?url=')) {
              node.href = proxyUrl(href);
            }
          }
          // Scripts
          if (node.tagName === 'SCRIPT') {
            const src = node.getAttribute('src');
            if (src && !src.includes('/proxy-fetch?url=')) {
              // Can't change script src after insertion, but log it
              console.log('Dynamic script:', src);
            }
          }
        }
      });
    });
  });
  
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  console.log('Proxy handler initialized for:', BASE_URL);
})();
</script>`;

  // Inject the script before </body> or at the end
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${navigationScript}</body>`);
  } else {
    html += navigationScript;
  }

  return html;
}

function rewriteCss(css: string, baseUrl: string, proxyPrefix: string): string {
  const proxy = (url: string): string => {
    const resolved = resolveUrl(url, baseUrl);
    if (!shouldProxy(resolved)) return resolved;
    return proxyPrefix + encodeURIComponent(resolved);
  };

  // Rewrite url()
  css = css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    if (url.startsWith('data:')) return match;
    return `url("${proxy(url)}")`;
  });

  // Rewrite @import
  css = css.replace(/@import\s+["']([^"']+)["']/gi, (match, url) => {
    return `@import "${proxy(url)}"`;
  });

  css = css.replace(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, url) => {
    return `@import url("${proxy(url)}")`;
  });

  return css;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim().substring(0, 100) : 'Untitled';
}

function extractFavicon(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*>/i);
    if (iconMatch) {
      return new URL(iconMatch[1], base).href;
    }
    return new URL('/favicon.ico', base).href;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const reqUrl = new URL(req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(clientId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let targetUrl: string | null = null;
    let mode: 'json' | 'raw' = 'json';

    // GET request = raw resource fetch
    if (req.method === 'GET') {
      targetUrl = reqUrl.searchParams.get('url');
      mode = 'raw';
    } 
    // POST request = navigation (returns JSON with metadata)
    else if (req.method === 'POST') {
      const body = await req.json();
      targetUrl = body.url;
      mode = 'json';
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS allowed' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isBlocked(targetUrl)) {
      return new Response(JSON.stringify({ error: 'Blocked domain' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Proxy ${mode}: ${targetUrl}`);

    const proxyPrefix = getProxyPrefix(req);

    // Fetch with browser-like headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': req.headers.get('accept') || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': new URL(targetUrl).origin,
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const finalUrl = response.url || targetUrl;

    // For raw mode (GET) - return resource directly
    if (mode === 'raw') {
      // HTML
      if (contentType.includes('text/html') || contentType.includes('xhtml')) {
        let html = await response.text();
        html = rewriteHtml(html, finalUrl, proxyPrefix);
        return new Response(html, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }
      
      // CSS
      if (contentType.includes('text/css')) {
        let css = await response.text();
        css = rewriteCss(css, finalUrl, proxyPrefix);
        return new Response(css, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // JavaScript - pass through
      if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
        const js = await response.text();
        return new Response(js, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // SVG - may need URL rewriting
      if (contentType.includes('image/svg')) {
        let svg = await response.text();
        // Rewrite xlink:href and href in SVG
        svg = svg.replace(/xlink:href\s*=\s*["']([^"']+)["']/gi, (match, url) => {
          if (url.startsWith('data:') || url.startsWith('#')) return match;
          const resolved = resolveUrl(url, finalUrl);
          return `xlink:href="${proxyPrefix}${encodeURIComponent(resolved)}"`;
        });
        return new Response(svg, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Fonts
      if (contentType.includes('font') || contentType.includes('woff') || contentType.includes('ttf') || contentType.includes('otf') || contentType.includes('eot')) {
        const data = await response.arrayBuffer();
        return new Response(data, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // Images and other binary
      const data = await response.arrayBuffer();
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For json mode (POST) - return structured response
    if (contentType.includes('text/html') || contentType.includes('xhtml')) {
      let html = await response.text();
      const title = extractTitle(html);
      const favicon = extractFavicon(html, finalUrl);
      html = rewriteHtml(html, finalUrl, proxyPrefix);

      return new Response(JSON.stringify({
        content: html,
        title,
        favicon,
        finalUrl,
        contentType: 'text/html',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (contentType.includes('application/json')) {
      const text = await response.text();
      return new Response(JSON.stringify({
        content: `<pre style="padding:20px;background:#1a1a2e;color:#0f0;font-family:monospace;white-space:pre-wrap;overflow:auto;">${text.replace(/</g, '&lt;')}</pre>`,
        title: 'JSON',
        favicon: null,
        finalUrl,
        contentType: 'application/json',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (contentType.includes('text/')) {
      const text = await response.text();
      return new Response(JSON.stringify({
        content: `<pre style="padding:20px;background:#1a1a2e;color:#eee;font-family:monospace;white-space:pre-wrap;">${text.replace(/</g, '&lt;')}</pre>`,
        title: 'Text',
        favicon: null,
        finalUrl,
        contentType,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: `Cannot display content type: ${contentType}` 
    }), {
      status: 415,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Proxy error:', error);
    const msg = error instanceof Error ? error.message : 'Request failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
