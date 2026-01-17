import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useProxy } from '@/contexts/ProxyContext';
import { ProxyStartPage } from './ProxyStartPage';
import { ProxySettings } from './ProxySettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// Get proxy URL for iframe
const getProxyUrl = (targetUrl: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hbhopyhvtedsiihaqthl.supabase.co';
  return `${supabaseUrl}/functions/v1/proxy-fetch?url=${encodeURIComponent(targetUrl)}`;
};

export function ProxyContent() {
  const { 
    getActiveTab, 
    setTabContent, 
    setTabError, 
    setTabLoading,
    navigate,
    addTab
  } = useProxy();
  const activeTab = getActiveTab();
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch metadata and set iframe when URL changes
  useEffect(() => {
    if (!activeTab) return;

    const { url, id } = activeTab;

    // Handle internal pages
    if (url.startsWith('proxy://')) {
      setTabLoading(id, false);
      setIframeSrc(null);
      return;
    }

    // For external URLs
    const loadPage = async () => {
      try {
        setTabLoading(id, true);
        setTabError(id, null);

        // POST to get metadata (title, favicon)
        const { data, error } = await supabase.functions.invoke('proxy-fetch', {
          body: { url },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch page');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Set metadata
        setTabContent(id, null, data.title, data.favicon);
        
        // Use the final URL (after redirects) for the iframe
        const targetUrl = data.finalUrl || url;
        setIframeSrc(getProxyUrl(targetUrl));
        setTabLoading(id, false);
      } catch (err) {
        console.error('Proxy error:', err);
        setTabError(id, err instanceof Error ? err.message : 'Failed to load page');
        setIframeSrc(null);
      }
    };

    loadPage();
  }, [activeTab?.url, activeTab?.id]);

  // Handle messages from iframe (navigation, new tabs)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'proxy-navigate' && event.data?.url) {
        if (event.data.newTab) {
          addTab(event.data.url);
        } else {
          navigate(event.data.url);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, addTab]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    if (activeTab && !activeTab.url.startsWith('proxy://')) {
      setTabLoading(activeTab.id, false);
    }
  };

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No active tab</p>
      </div>
    );
  }

  const { url, isLoading, error } = activeTab;

  // Internal start page
  if (url === 'proxy://start') {
    return <ProxyStartPage />;
  }

  // Internal settings page
  if (url === 'proxy://settings') {
    return <ProxySettings />;
  }

  // Loading state
  if (isLoading && !iframeSrc) {
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

  // Render content using iframe
  if (iframeSrc) {
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-presentation"
          title="Proxy Content"
          referrerPolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          onLoad={handleIframeLoad}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">No content</p>
    </div>
  );
}
