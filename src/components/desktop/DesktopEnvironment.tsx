import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { DesktopWindowComponent } from './DesktopWindow';
import { DesktopTerminal } from './DesktopTerminal';
import { FileManager } from './FileManager';
import { SettingsApp } from './SettingsApp';
import { DesktopChat } from './DesktopChat';
import { DesktopMusic } from './DesktopMusic';
import type { DesktopTheme, DesktopApp, DesktopWindow, FileSystemNode } from './types';
import { DEFAULT_FILE_SYSTEM } from './types';

interface DesktopEnvironmentProps {
  onExit: () => void;
}

const DESKTOP_APPS: DesktopApp[] = [
  { id: 'terminal', name: 'Terminal', icon: 'terminal', type: 'terminal' },
  { id: 'files', name: 'Files', icon: 'folder', type: 'filemanager' },
  { id: 'chat', name: 'Chat', icon: 'chat', type: 'custom' },
  { id: 'music', name: 'Music', icon: 'music', type: 'custom' },
  { id: 'settings', name: 'Settings', icon: 'settings', type: 'settings' },
];

export function DesktopEnvironment({ onExit }: DesktopEnvironmentProps) {
  const { user } = useAuth();
  const { customBackground } = useTheme();
  const [theme, setTheme] = useState<DesktopTheme>(() => {
    return (localStorage.getItem('solarnova-desktop-theme') as DesktopTheme) || 'windows';
  });
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [fileSystem, setFileSystem] = useState<Record<string, FileSystemNode>>(DEFAULT_FILE_SYSTEM);
  const [games, setGames] = useState<any[]>([]);
  const [pinnedApps, setPinnedApps] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('solarnova-desktop-pinned') || '[]');
    } catch { return []; }
  });

  // Fetch games for desktop icons
  useEffect(() => {
    supabase.from('games').select('id, title, url, embed, category').order('display_order').then(({ data }) => {
      if (data) setGames(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('solarnova-desktop-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('solarnova-desktop-pinned', JSON.stringify(pinnedApps));
  }, [pinnedApps]);

  const togglePin = useCallback((appId: string) => {
    setPinnedApps(prev => 
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  }, []);

  const openWindow = useCallback((appId: string, title: string) => {
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
      setNextZIndex(prev => prev + 1);
      return;
    }

    const offsetCount = windows.length;
    const isGame = games.find(g => g.id === appId);
    const newWindow: DesktopWindow = {
      id: `${appId}-${Date.now()}`,
      appId,
      title,
      isMinimized: false,
      isMaximized: !!isGame, // Games open maximized
      zIndex: nextZIndex,
      x: 100 + offsetCount * 30,
      y: 60 + offsetCount * 30,
      width: isGame ? window.innerWidth : 700,
      height: isGame ? window.innerHeight - 48 : 450,
    };
    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  }, [windows, nextZIndex, games]);

  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id));
  const minimizeWindow = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  const maximizeWindow = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  const focusWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
    setNextZIndex(prev => prev + 1);
  };
  const moveWindow = (id: string, x: number, y: number) => setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));

  const handleWindowClick = (id: string) => {
    const win = windows.find(w => w.id === id);
    if (win?.isMinimized) minimizeWindow(id);
    else focusWindow(id);
  };

  const renderWindowContent = (win: DesktopWindow) => {
    if (win.appId === 'terminal') {
      return <DesktopTerminal fileSystem={fileSystem} onFileSystemChange={setFileSystem} />;
    }
    if (win.appId === 'files') {
      return <FileManager fileSystem={fileSystem} />;
    }
    if (win.appId === 'settings') {
      return <SettingsApp theme={theme} onThemeChange={setTheme} />;
    }
    if (win.appId === 'chat') {
      return <DesktopChat />;
    }
    if (win.appId === 'music') {
      return <DesktopMusic />;
    }
    // Game window - embed the game directly
    const game = games.find(g => g.id === win.appId);
    if (game && game.embed) {
      return (
        <iframe
          src={game.url}
          title={game.title}
          className="w-full h-full border-0"
          allow="fullscreen; autoplay; encrypted-media"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        />
      );
    }
    if (game) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
          <h3 className="text-lg font-bold text-foreground">{game.title}</h3>
          <p className="text-sm text-muted-foreground">[{game.category}]</p>
          <button
            onClick={() => window.open(game.url, '_blank')}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Open in New Tab
          </button>
        </div>
      );
    }
    return <div className="p-4 text-muted-foreground">Unknown app</div>;
  };

  // Determine background
  const hasCustomBg = customBackground.type !== 'none' && customBackground.url;
  const wallpaper = theme === 'macos'
    ? 'bg-gradient-to-br from-[hsl(270,60%,30%)] via-[hsl(300,50%,25%)] to-[hsl(330,60%,30%)]'
    : 'bg-gradient-to-br from-[hsl(220,50%,15%)] via-[hsl(270,40%,20%)] to-[hsl(220,50%,15%)]';

  return (
    <div className={`fixed inset-0 z-[300] overflow-hidden select-none ${!hasCustomBg ? wallpaper : 'bg-black'}`}>
      {/* Custom background */}
      {hasCustomBg && customBackground.type === 'video' && (
        <video
          src={customBackground.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}
      {hasCustomBg && customBackground.type === 'image' && (
        <img
          src={customBackground.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Desktop Icons */}
      <div className={`absolute z-10 ${theme === 'macos' ? 'top-10 right-4' : 'top-4 left-4'} flex flex-col flex-wrap gap-1 max-h-[calc(100vh-80px)]`}>
        {DESKTOP_APPS.map(app => (
          <DesktopIcon
            key={app.id}
            name={app.name}
            icon={app.icon}
            theme={theme}
            onDoubleClick={() => openWindow(app.id, app.name)}
            onPin={() => togglePin(app.id)}
            isPinned={pinnedApps.includes(app.id)}
          />
        ))}
        <div className="h-2" />
        {games.slice(0, 12).map(game => (
          <DesktopIcon
            key={game.id}
            name={game.title}
            icon="gamepad"
            theme={theme}
            onDoubleClick={() => openWindow(game.id, game.title)}
            onPin={() => togglePin(game.id)}
            isPinned={pinnedApps.includes(game.id)}
          />
        ))}
      </div>

      {/* Windows */}
      {windows.map(win => (
        <DesktopWindowComponent
          key={win.id}
          window={win}
          theme={theme}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onFocus={focusWindow}
          onMove={moveWindow}
        >
          {renderWindowContent(win)}
        </DesktopWindowComponent>
      ))}

      {/* Taskbar */}
      <Taskbar
        theme={theme}
        windows={windows}
        pinnedApps={pinnedApps}
        allApps={[...DESKTOP_APPS, ...games.slice(0, 12).map(g => ({ id: g.id, name: g.title, icon: 'gamepad', type: 'game' as const }))]}
        onWindowClick={handleWindowClick}
        onAppLaunch={(id, name) => openWindow(id, name)}
        onUnpin={(id) => togglePin(id)}
        onExitDesktop={onExit}
      />
    </div>
  );
}
