import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ProxyTab {
  id: string;
  url: string;
  title: string;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  history: string[];
  historyIndex: number;
  favicon: string | null;
}

export type SearchEngine = 'google' | 'bing' | 'duckduckgo';

interface ProxyState {
  tabs: ProxyTab[];
  activeTabId: string;
  searchEngine: SearchEngine;
  isFullscreen: boolean;
}

interface ProxyContextType extends ProxyState {
  addTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  navigate: (url: string, tabId?: string) => void;
  goBack: (tabId?: string) => void;
  goForward: (tabId?: string) => void;
  reload: (tabId?: string) => void;
  goHome: (tabId?: string) => void;
  setSearchEngine: (engine: SearchEngine) => void;
  setTabContent: (tabId: string, content: string | null, title?: string, favicon?: string | null) => void;
  setTabLoading: (tabId: string, isLoading: boolean) => void;
  setTabError: (tabId: string, error: string | null) => void;
  toggleFullscreen: () => void;
  getActiveTab: () => ProxyTab | undefined;
}

const ProxyContext = createContext<ProxyContextType | undefined>(undefined);

const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createNewTab = (url: string = 'proxy://start'): ProxyTab => ({
  id: generateTabId(),
  url,
  title: url === 'proxy://start' ? 'New Tab' : 'Loading...',
  content: null,
  isLoading: false,
  error: null,
  history: [url],
  historyIndex: 0,
  favicon: null,
});

const MAX_TABS = 10;

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<ProxyTab[]>(() => [createNewTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');
  const [searchEngine, setSearchEngineState] = useState<SearchEngine>('google');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const addTab = useCallback((url?: string) => {
    if (tabs.length >= MAX_TABS) return;
    
    const newTab = createNewTab(url);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If we closed the active tab, switch to the last tab
      if (tabId === activeTabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      
      // If no tabs left, create a new one
      if (newTabs.length === 0) {
        const newTab = createNewTab();
        setActiveTabId(newTab.id);
        return [newTab];
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const navigate = useCallback((url: string, tabId?: string) => {
    const targetId = tabId || activeTabId;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId) return tab;
      
      // Add to history
      const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), url];
      
      return {
        ...tab,
        url,
        title: 'Loading...',
        content: null,
        isLoading: true,
        error: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }));
  }, [activeTabId]);

  const goBack = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId || tab.historyIndex <= 0) return tab;
      
      const newIndex = tab.historyIndex - 1;
      const newUrl = tab.history[newIndex];
      
      return {
        ...tab,
        url: newUrl,
        title: 'Loading...',
        content: null,
        isLoading: true,
        error: null,
        historyIndex: newIndex,
      };
    }));
  }, [activeTabId]);

  const goForward = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId || tab.historyIndex >= tab.history.length - 1) return tab;
      
      const newIndex = tab.historyIndex + 1;
      const newUrl = tab.history[newIndex];
      
      return {
        ...tab,
        url: newUrl,
        title: 'Loading...',
        content: null,
        isLoading: true,
        error: null,
        historyIndex: newIndex,
      };
    }));
  }, [activeTabId]);

  const reload = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId) return tab;
      
      return {
        ...tab,
        content: null,
        isLoading: true,
        error: null,
      };
    }));
  }, [activeTabId]);

  const goHome = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    navigate('proxy://start', targetId);
  }, [activeTabId, navigate]);

  const setSearchEngine = useCallback((engine: SearchEngine) => {
    setSearchEngineState(engine);
    localStorage.setItem('proxy-search-engine', engine);
  }, []);

  const setTabContent = useCallback((tabId: string, content: string | null, title?: string, favicon?: string | null) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      
      return {
        ...tab,
        content,
        title: title || tab.title,
        favicon: favicon !== undefined ? favicon : tab.favicon,
        isLoading: false,
      };
    }));
  }, []);

  const setTabLoading = useCallback((tabId: string, isLoading: boolean) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      return { ...tab, isLoading };
    }));
  }, []);

  const setTabError = useCallback((tabId: string, error: string | null) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      return { ...tab, error, isLoading: false };
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const getActiveTab = useCallback(() => {
    return tabs.find(t => t.id === activeTabId);
  }, [tabs, activeTabId]);

  return (
    <ProxyContext.Provider
      value={{
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
        setTabContent,
        setTabLoading,
        setTabError,
        toggleFullscreen,
        getActiveTab,
      }}
    >
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  const context = useContext(ProxyContext);
  if (!context) {
    throw new Error('useProxy must be used within a ProxyProvider');
  }
  return context;
}
