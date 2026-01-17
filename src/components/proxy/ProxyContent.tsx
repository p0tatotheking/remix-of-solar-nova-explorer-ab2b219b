import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useProxy } from '@/contexts/ProxyContext';
import { ProxyStartPage } from './ProxyStartPage';
import { ProxySettings } from './ProxySettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// Get proxy URL for resources
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
    navigate 
  } = useProxy();
  const activeTab = getActiveTab();
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  // Fetch content when URL changes
  useEffect(() => {
    if (!activeTab) return;

    const { url, id } = activeTab;

    // Handle internal pages
    if (url.startsWith('proxy://')) {
      setTabLoading(id, false);
      setIframeSrc(null);
      return;
    }

    // For external URLs, use the proxy directly as iframe src
    const fetchContent = async () => {
      try {
        setTabLoading(id, true);
        setTabError(id, null);

        // First, get metadata via POST
        const { data, error } = await supabase.functions.invoke('proxy-fetch', {
          body: { url },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch content');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Set metadata
        setTabContent(id, data.content, data.title, data.favicon);
        
        // Use GET URL for iframe
        setIframeSrc(getProxyUrl(data.finalUrl || url));
      } catch (err) {
        console.error('Proxy fetch error:', err);
        setTabError(id, err instanceof Error ? err.message : 'Failed to load page');
        setIframeSrc(null);
      }
    };

    fetchContent();
  }, [activeTab?.url, activeTab?.id]);

  // Handle messages from iframe
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

  // Render content using iframe with direct proxy URL
  if (iframeSrc) {
    return (
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
        title="Proxy Content"
        referrerPolicy="no-referrer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">No content</p>
    </div>
  );
}
