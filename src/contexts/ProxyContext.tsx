import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ProxyTab {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
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
  setTabTitle: (tabId: string, title: string) => void;
  toggleFullscreen: () => void;
  getActiveTab: () => ProxyTab | undefined;
}

const ProxyContext = createContext<ProxyContextType | undefined>(undefined);

const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createNewTab = (url: string = 'proxy://start'): ProxyTab => ({
  id: generateTabId(),
  url,
  title: url === 'proxy://start' ? 'New Tab' : 'Loading...',
  history: [url],
  historyIndex: 0,
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
      if (tabId === activeTabId && newTabs.length > 0) {
        const closedIndex = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
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
      const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), url];
      return {
        ...tab,
        url,
        title: url.startsWith('proxy://') ? (url === 'proxy://start' ? 'New Tab' : 'Settings') : 'Loading...',
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
      return { ...tab, url: tab.history[newIndex], historyIndex: newIndex, title: 'Loading...' };
    }));
  }, [activeTabId]);

  const goForward = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId || tab.historyIndex >= tab.history.length - 1) return tab;
      const newIndex = tab.historyIndex + 1;
      return { ...tab, url: tab.history[newIndex], historyIndex: newIndex, title: 'Loading...' };
    }));
  }, [activeTabId]);

  const reload = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    // Force re-render by toggling URL briefly
    setTabs(prev => prev.map(tab => {
      if (tab.id !== targetId) return tab;
      return { ...tab, title: 'Reloading...' };
    }));
    // The iframe component will detect the reload via a key change
    setTimeout(() => {
      setTabs(prev => prev.map(tab => {
        if (tab.id !== targetId) return tab;
        return { ...tab, title: 'Loading...' };
      }));
    }, 50);
  }, [activeTabId]);

  const goHome = useCallback((tabId?: string) => {
    const targetId = tabId || activeTabId;
    navigate('proxy://start', targetId);
  }, [activeTabId, navigate]);

  const setSearchEngine = useCallback((engine: SearchEngine) => {
    setSearchEngineState(engine);
    localStorage.setItem('proxy-search-engine', engine);
  }, []);

  const setTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab;
      return { ...tab, title };
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
        tabs, activeTabId, searchEngine, isFullscreen,
        addTab, closeTab, setActiveTab, navigate, goBack, goForward,
        reload, goHome, setSearchEngine, setTabTitle, toggleFullscreen, getActiveTab,
      }}
    >
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  const context = useContext(ProxyContext);
  if (!context) throw new Error('useProxy must be used within a ProxyProvider');
  return context;
}
