import React, { useEffect, useRef, useState, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useProxy } from '@/contexts/ProxyContext';
import { ProxyStartPage } from './ProxyStartPage';
import { ProxySettings } from './ProxySettings';
import { getHolyUnblockerUrl } from '@/lib/proxyConfig';

export const ProxyContent = forwardRef<HTMLDivElement, object>(function ProxyContent(_, ref) {
  const { getActiveTab, setTabTitle } = useProxy();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const activeTab = getActiveTab();
  const prevUrlRef = useRef<string | null>(null);

  // Build the Holy Unblocker iframe URL from the target URL
  const getProxiedUrl = (targetUrl: string): string => {
    const base = getHolyUnblockerUrl();
    // Holy Unblocker uses Ultraviolet - encode the target URL
    // The service worker intercepts and proxies all requests
    const encodedUrl = encodeURIComponent(targetUrl);
    return `${base}?url=${encodedUrl}`;
  };

  // Detect URL changes and trigger loading
  useEffect(() => {
    if (!activeTab) return;
    const { url } = activeTab;
    
    if (url.startsWith('proxy://')) {
      setIsLoading(false);
      return;
    }

    if (prevUrlRef.current !== url) {
      setIsLoading(true);
      prevUrlRef.current = url;
    }
  }, [activeTab?.url]);

  // Handle reload
  useEffect(() => {
    if (!activeTab || activeTab.url.startsWith('proxy://')) return;
    if (activeTab.title === 'Reloading...') {
      setReloadKey(prev => prev + 1);
      setIsLoading(true);
    }
  }, [activeTab?.title]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsLoading(false);
    if (activeTab) {
      // Try to get the page title from the iframe
      try {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (iframeDoc?.title) {
          setTabTitle(activeTab.id, iframeDoc.title);
        } else {
          // Use domain as fallback title
          const url = new URL(activeTab.url);
          setTabTitle(activeTab.id, url.hostname);
        }
      } catch {
        // Cross-origin - use domain as title
        try {
          const url = new URL(activeTab.url);
          setTabTitle(activeTab.id, url.hostname);
        } catch {
          setTabTitle(activeTab.id, 'Proxy');
        }
      }
    }
  };

  if (!activeTab) {
    return (
      <div ref={ref} className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No active tab</p>
      </div>
    );
  }

  const { url } = activeTab;

  // Internal start page
  if (url === 'proxy://start') {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className="h-full">
        <ProxyStartPage />
      </div>
    );
  }

  // Internal settings page
  if (url === 'proxy://settings') {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className="h-full">
        <ProxySettings />
      </div>
    );
  }

  // Render Holy Unblocker iframe
  const iframeSrc = getProxiedUrl(url);

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4 text-sm">Loading {url}...</p>
        </div>
      )}
      <iframe
        key={`${activeTab.id}-${reloadKey}`}
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-storage-access-by-user-activation"
        allow="autoplay; fullscreen; clipboard-write"
        title="Proxy Content"
      />
    </div>
  );
});
