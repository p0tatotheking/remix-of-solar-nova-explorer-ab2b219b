import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 300;
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
  // IMPORTANT: inside the function runtime, req.url may point to an internal host/path.
  // We must build the public-facing prefix explicitly so rewritten resources load.
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  return `${proto}://${host}/functions/v1/proxy-fetch?url=`;
}

function resolveUrl(path: string, base: string): string {
  if (!path || path.startsWith('data:') || path.startsWith('javascript:') || path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('tel:') || path.startsWith('blob:') || path.startsWith('about:')) {
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

function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 800).toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.includes('<head') ||
    head.includes('<body') ||
    head.includes('<script') ||
    head.includes('<meta')
  );
}

function rewriteHtml(html: string, baseUrl: string, proxyPrefix: string): string {
  const proxy = (url: string): string => {
    const resolved = resolveUrl(url, baseUrl);
    if (!shouldProxy(resolved)) return resolved;
    return proxyPrefix + encodeURIComponent(resolved);
  };

  // Parse base URL for origin
  let baseOrigin = '';
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {}

  // Remove existing base tags
  html = html.replace(/<base[^>]*>/gi, '');

  // Inject base tag
  const baseTag = `<base href="${baseUrl}">`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${baseTag}`);
  } else if (html.includes('<head ')) {
    html = html.replace(/<head\s/, `<head>${baseTag}<head `);
  } else if (html.includes('<html')) {
    html = html.replace(/<html[^>]*>/, `$&<head>${baseTag}</head>`);
  } else {
    html = baseTag + html;
  }

  // Rewrite all src attributes
  html = html.replace(/(<(?:img|script|iframe|video|audio|source|embed|input|track)[^>]*\s)src\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, quote, url) => {
      if (!url || url.startsWith('data:') || url.startsWith('blob:')) return match;
      return `${before}src=${quote}${proxy(url)}${quote}`;
    }
  );

  // Rewrite href for link/a tags
  html = html.replace(/(<link[^>]*\s)href\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, quote, url) => {
      if (!url || url.startsWith('data:')) return match;
      return `${before}href=${quote}${proxy(url)}${quote}`;
    }
  );

  // Rewrite srcset
  html = html.replace(/srcset\s*=\s*(["'])([^"']+)\1/gi, (match, quote, srcset) => {
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
    return `srcset=${quote}${parts.join(', ')}${quote}`;
  });

  // Rewrite poster
  html = html.replace(/poster\s*=\s*(["'])([^"']*)\1/gi, (match, quote, url) => {
    return `poster=${quote}${proxy(url)}${quote}`;
  });

  // Rewrite url() in inline styles and style blocks
  html = html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    if (url.startsWith('data:')) return match;
    return `url(${quote}${proxy(url)}${quote})`;
  });

  // Rewrite @import
  html = html.replace(/@import\s+(["'])([^"']+)\1/gi, (match, quote, url) => {
    return `@import ${quote}${proxy(url)}${quote}`;
  });

  html = html.replace(/@import\s+url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    return `@import url(${quote}${proxy(url)}${quote})`;
  });

  // Rewrite form actions
  html = html.replace(/(<form[^>]*\s)action\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, quote, url) => {
      return `${before}action=${quote}${proxy(url)}${quote}`;
    }
  );

  // Rewrite meta refresh
  html = html.replace(/(<meta[^>]*content\s*=\s*["'][^"']*url=)([^"'\s;>]+)/gi,
    (match, before, url) => {
      return `${before}${proxy(url)}`;
    }
  );

  // The client-side script to handle navigation, fetch, XHR, etc.
  const clientScript = `
<script data-proxy="true">
(function() {
  'use strict';
  
  const PROXY_PREFIX = "${proxyPrefix}";
  const BASE_URL = "${baseUrl}";
  const BASE_ORIGIN = "${baseOrigin}";
  
  // Utility to proxy URLs
  function proxyUrl(url, base) {
    if (!url) return url;
    if (typeof url !== 'string') url = String(url);
    if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('blob:') || url.startsWith('about:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }
    try {
      const absolute = new URL(url, base || BASE_URL).href;
      if (absolute.includes('/proxy-fetch?url=')) return url;
      return PROXY_PREFIX + encodeURIComponent(absolute);
    } catch (e) {
      return url;
    }
  }
  
  // Override window.open
  const origOpen = window.open;
  window.open = function(url, target, features) {
    if (url && !url.startsWith('javascript:')) {
      try {
        const absolute = new URL(url, BASE_URL).href;
        window.parent.postMessage({ type: 'proxy-navigate', url: absolute, newTab: true }, '*');
        return null;
      } catch (e) {}
    }
    return origOpen.call(this, url, target, features);
  };
  
  // Override fetch
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    let url = input;
    if (input instanceof Request) {
      url = input.url;
    }
    if (typeof url === 'string' && url.startsWith('http') && !url.includes('/proxy-fetch?url=')) {
      const proxiedUrl = proxyUrl(url);
      if (input instanceof Request) {
        input = new Request(proxiedUrl, input);
      } else {
        input = proxiedUrl;
      }
    }
    return origFetch.call(this, input, init);
  };
  
  // Override XMLHttpRequest
  const origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    if (typeof url === 'string' && url.startsWith('http') && !url.includes('/proxy-fetch?url=')) {
      url = proxyUrl(url);
    }
    return origXHROpen.call(this, method, url, async, user, pass);
  };
  
  // Override Image src
  const origImageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (origImageDescriptor) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get: function() { return origImageDescriptor.get.call(this); },
      set: function(val) {
        if (val && !val.startsWith('data:') && !val.startsWith('blob:') && !val.includes('/proxy-fetch?url=')) {
          val = proxyUrl(val);
        }
        origImageDescriptor.set.call(this, val);
      }
    });
  }
  
  // Handle all clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
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
  
  // Handle form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form && form.tagName === 'FORM') {
      e.preventDefault();
      e.stopPropagation();
      
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
        console.error('Form submission error:', err);
      }
    }
  }, true);
  
  // Observe DOM for new elements
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mut) {
      mut.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          // Fix images
          const imgs = node.tagName === 'IMG' ? [node] : (node.querySelectorAll ? Array.from(node.querySelectorAll('img')) : []);
          imgs.forEach(function(img) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('/proxy-fetch?url=')) {
              img.setAttribute('src', proxyUrl(src));
            }
            // Handle data-src for lazy loading
            ['data-src', 'data-lazy-src', 'data-original', 'data-srcset'].forEach(function(attr) {
              const val = img.getAttribute(attr);
              if (val && !val.startsWith('data:') && !val.includes('/proxy-fetch?url=')) {
                img.setAttribute(attr, proxyUrl(val));
              }
            });
          });
          
          // Fix video/audio sources
          const media = node.querySelectorAll ? Array.from(node.querySelectorAll('video source, audio source')) : [];
          media.forEach(function(el) {
            const src = el.getAttribute('src');
            if (src && !src.includes('/proxy-fetch?url=')) {
              el.setAttribute('src', proxyUrl(src));
            }
          });
          
          // Fix stylesheets
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const href = node.getAttribute('href');
            if (href && !href.includes('/proxy-fetch?url=')) {
              node.setAttribute('href', proxyUrl(href));
            }
          }
          
          // Fix background images in inline styles
          if (node.style && node.style.backgroundImage) {
            const bg = node.style.backgroundImage;
            if (bg.includes('url(') && !bg.includes('/proxy-fetch?url=') && !bg.includes('data:')) {
              const match = bg.match(/url\\(["']?([^"')]+)["']?\\)/);
              if (match && match[1]) {
                node.style.backgroundImage = 'url("' + proxyUrl(match[1]) + '")';
              }
            }
          }
        }
      });
    });
  });
  
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
  
  // Disable service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register = function() {
      return Promise.reject(new Error('Service workers disabled in proxy'));
    };
  }
  
  console.log('[Proxy] Initialized for:', BASE_URL);
})();
</script>`;

  // Inject script after <head> or at the beginning
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${clientScript}</head>`);
  } else if (html.includes('<body')) {
    html = html.replace(/<body[^>]*>/, `$&${clientScript}`);
  } else {
    html = clientScript + html;
  }

  // Remove Content-Security-Policy meta tags that might block our scripts
  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, '');

  return html;
}

function rewriteCss(css: string, baseUrl: string, proxyPrefix: string): string {
  const proxy = (url: string): string => {
    const resolved = resolveUrl(url, baseUrl);
    if (!shouldProxy(resolved)) return resolved;
    return proxyPrefix + encodeURIComponent(resolved);
  };

  // Rewrite url()
  css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    if (url.startsWith('data:')) return match;
    return `url(${quote}${proxy(url)}${quote})`;
  });

  // Rewrite @import
  css = css.replace(/@import\s+(["'])([^"']+)\1/gi, (match, quote, url) => {
    return `@import ${quote}${proxy(url)}${quote}`;
  });

  css = css.replace(/@import\s+url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
    return `@import url(${quote}${proxy(url)}${quote})`;
  });

  return css;
}

function rewriteJs(js: string, baseUrl: string, proxyPrefix: string): string {
  // For JavaScript, we wrap fetch/XHR calls - but the client script handles most of this
  // Just pass through for now, as modifying JS is complex and error-prone
  return js;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim().substring(0, 100) : 'Untitled';
}

function extractFavicon(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const iconMatch = html.match(/<link[^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*>/i);
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

    // GET = raw resource, POST = JSON metadata
    if (req.method === 'GET') {
      targetUrl = reqUrl.searchParams.get('url');
      mode = 'raw';
    } else if (req.method === 'POST') {
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

    console.log(`[Proxy] ${mode}: ${targetUrl}`);

    const proxyPrefix = getProxyPrefix(req);

    // Fetch with browser-like headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': req.headers.get('accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': parsed.origin,
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const finalUrl = response.url || targetUrl;

    // RAW mode - return resource directly
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
            'X-Frame-Options': 'ALLOWALL',
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

      // JavaScript
      if (contentType.includes('javascript') || contentType.includes('ecmascript')) {
        let js = await response.text();
        js = rewriteJs(js, finalUrl, proxyPrefix);
        return new Response(js, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // JSON - pass through
      if (contentType.includes('application/json')) {
        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
      }

      // SVG
      if (contentType.includes('image/svg')) {
        let svg = await response.text();
        svg = svg.replace(/xlink:href\s*=\s*(["'])([^"']+)\1/gi, (match, quote, url) => {
          if (url.startsWith('data:') || url.startsWith('#')) return match;
          const resolved = resolveUrl(url, finalUrl);
          return `xlink:href=${quote}${proxyPrefix}${encodeURIComponent(resolved)}${quote}`;
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

      // Binary content (images, fonts, etc.)
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

    // JSON mode - return metadata for POST requests
    if (contentType.includes('text/html') || contentType.includes('xhtml')) {
      const html = await response.text();
      const title = extractTitle(html);
      const favicon = extractFavicon(html, finalUrl);

      return new Response(JSON.stringify({
        title,
        favicon,
        finalUrl,
        contentType: 'text/html',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      title: 'Page',
      favicon: null,
      finalUrl,
      contentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Proxy] Error:', error);
    const msg = error instanceof Error ? error.message : 'Request failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
