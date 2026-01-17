import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Home, 
  Plus, 
  Settings, 
  Maximize2, 
  Minimize2,
  X,
  Search,
  Lock,
  Globe
} from 'lucide-react';
import { useProxy, SearchEngine } from '@/contexts/ProxyContext';
import { ProxyTab } from './ProxyTab';
import { ProxyContent } from './ProxyContent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProxyBrowserProps {
  onClose?: () => void;
}

const searchEngines: { id: SearchEngine; name: string; searchUrl: string }[] = [
  { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q=' },
  { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=' },
];

export function ProxyBrowser({ onClose }: ProxyBrowserProps) {
  const {
    tabs,
    activeTabId,
    searchEngine,
    isFullscreen,
    addTab,
    closeTab,
    setActiveTab,
    navigate,
    goBack,
    goForward,
    reload,
    goHome,
    setSearchEngine,
    toggleFullscreen,
    getActiveTab,
  } = useProxy();

  const [urlInput, setUrlInput] = useState('');
  const activeTab = getActiveTab();

  // Sync URL input with active tab URL
  useEffect(() => {
    if (activeTab && !activeTab.url.startsWith('proxy://')) {
      setUrlInput(activeTab.url);
    } else {
      setUrlInput('');
    }
  }, [activeTab?.url, activeTabId]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let url = urlInput.trim();

    // Check if it looks like a URL
    if (url.includes('.') && !url.includes(' ')) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
    } else {
      // Convert to search URL
      const engine = searchEngines.find(e => e.id === searchEngine) || searchEngines[0];
      url = engine.searchUrl + encodeURIComponent(urlInput);
    }

    navigate(url);
  };

  const canGoBack = activeTab && activeTab.historyIndex > 0;
  const canGoForward = activeTab && activeTab.historyIndex < activeTab.history.length - 1;

  const isSecure = activeTab?.url.startsWith('https://');
  const isInternal = activeTab?.url.startsWith('proxy://');

  return (
    <div className={`flex flex-col h-full bg-background ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Tab Bar */}
      <div className="flex items-center bg-muted/30 border-b border-border/30 overflow-x-auto">
        <div className="flex flex-1 items-end gap-0.5 px-2 pt-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <ProxyTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              canClose={tabs.length > 1}
            />
          ))}
          
          {/* Add Tab Button */}
          {tabs.length < 10 && (
            <button
              onClick={() => addTab()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mb-1"
              title="New tab"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Close proxy"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm border-b border-border/30">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goBack()}
            disabled={!canGoBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goForward()}
            disabled={!canGoForward}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => reload()}
            disabled={isInternal}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => goHome()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {isInternal ? (
                <Globe className="w-4 h-4 text-muted-foreground" />
              ) : isSecure ? (
                <Lock className="w-4 h-4 text-green-500" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <Input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Search or enter URL"
              className="pl-10 pr-4 bg-muted/30 border-border/50 focus:border-primary/50"
            />
          </div>
        </form>

        {/* Search Engine & Settings */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Search className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {searchEngines.map((engine) => (
                <DropdownMenuItem
                  key={engine.id}
                  onClick={() => setSearchEngine(engine.id)}
                  className={searchEngine === engine.id ? 'bg-muted' : ''}
                >
                  {engine.name}
                  {searchEngine === engine.id && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => navigate('proxy://settings')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <ProxyContent />
      </div>
    </div>
  );
}
