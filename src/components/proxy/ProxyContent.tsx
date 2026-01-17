import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useProxy } from '@/contexts/ProxyContext';
import { ProxyStartPage } from './ProxyStartPage';
import { ProxySettings } from './ProxySettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export function ProxyContent() {
  const { 
    getActiveTab, 
    setTabContent, 
    setTabError, 
    setTabLoading,
    navigate 
  } = useProxy();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeTab = getActiveTab();

  // Fetch content when URL changes
  useEffect(() => {
    if (!activeTab) return;

    const { url, id } = activeTab;

    // Handle internal pages
    if (url.startsWith('proxy://')) {
      setTabLoading(id, false);
      return;
    }

    // Fetch external content
    const fetchContent = async () => {
      try {
        setTabLoading(id, true);
        setTabError(id, null);

        const { data, error } = await supabase.functions.invoke('proxy-fetch', {
          body: { url },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch content');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setTabContent(id, data.content, data.title, data.favicon);
      } catch (err) {
        console.error('Proxy fetch error:', err);
        setTabError(id, err instanceof Error ? err.message : 'Failed to load page');
      }
    };

    fetchContent();
  }, [activeTab?.url, activeTab?.id]);

  // Handle link clicks within the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'proxy-navigate' && event.data?.url) {
        navigate(event.data.url);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No active tab</p>
      </div>
    );
  }

  const { url, content, isLoading, error } = activeTab;

  // Internal start page
  if (url === 'proxy://start') {
    return <ProxyStartPage />;
  }

  // Internal settings page
  if (url === 'proxy://settings') {
    return <ProxySettings />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading {url}...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Failed to load page</h2>
          <p className="text-muted-foreground max-w-md mb-4">{error}</p>
          <p className="text-sm text-muted-foreground/60">
            URL: {url}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('proxy://start')}
          >
            Go Home
          </Button>
          <Button
            onClick={() => navigate(url)}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Render content in sandboxed iframe
  if (content) {
    const iframeContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            // Intercept link clicks and send to parent
            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href && !link.href.startsWith('javascript:')) {
                e.preventDefault();
                window.parent.postMessage({
                  type: 'proxy-navigate',
                  url: link.href
                }, '*');
              }
            });
            
            // Intercept form submissions
            document.addEventListener('submit', function(e) {
              e.preventDefault();
              const form = e.target;
              if (form.action) {
                const formData = new FormData(form);
                const params = new URLSearchParams(formData).toString();
                const url = form.method === 'get' 
                  ? form.action + '?' + params 
                  : form.action;
                window.parent.postMessage({
                  type: 'proxy-navigate',
                  url: url
                }, '*');
              }
            });
          </script>
        </body>
      </html>
    `;

    return (
      <iframe
        ref={iframeRef}
        srcDoc={iframeContent}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Proxy Content"
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">No content</p>
    </div>
  );
}
