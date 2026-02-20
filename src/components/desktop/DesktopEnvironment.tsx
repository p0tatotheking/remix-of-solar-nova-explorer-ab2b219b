import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { DesktopWindowComponent } from './DesktopWindow';
import { DesktopTerminal } from './DesktopTerminal';
import { FileManager } from './FileManager';
import { SettingsApp } from './SettingsApp';
import { GameEmbed } from '@/components/GameEmbed';
import type { DesktopTheme, DesktopApp, DesktopWindow, FileSystemNode } from './types';
import { DEFAULT_FILE_SYSTEM } from './types';

interface DesktopEnvironmentProps {
  onExit: () => void;
}

const DESKTOP_APPS: DesktopApp[] = [
  { id: 'terminal', name: 'Terminal', icon: 'terminal', type: 'terminal' },
  { id: 'files', name: 'Files', icon: 'folder', type: 'filemanager' },
  { id: 'settings', name: 'Settings', icon: 'settings', type: 'settings' },
];

export function DesktopEnvironment({ onExit }: DesktopEnvironmentProps) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<DesktopTheme>(() => {
    return (localStorage.getItem('solarnova-desktop-theme') as DesktopTheme) || 'windows';
  });
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [fileSystem, setFileSystem] = useState<Record<string, FileSystemNode>>(DEFAULT_FILE_SYSTEM);
  const [games, setGames] = useState<any[]>([]);
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);

  // Fetch games for desktop icons
  useEffect(() => {
    supabase.from('games').select('id, title, url, embed, category').order('display_order').then(({ data }) => {
      if (data) setGames(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('solarnova-desktop-theme', theme);
  }, [theme]);

  const openWindow = useCallback((appId: string, title: string) => {
    // Check if already open
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
      setNextZIndex(prev => prev + 1);
      return;
    }

    const offsetCount = windows.length;
    const newWindow: DesktopWindow = {
      id: `${appId}-${Date.now()}`,
      appId,
      title,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZIndex,
      x: 100 + offsetCount * 30,
      y: 60 + offsetCount * 30,
      width: 700,
      height: 450,
    };
    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  }, [windows, nextZIndex]);

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

  const handleGameClick = (game: any) => {
    if (game.embed) {
      setEmbeddedGame({ url: game.url, title: game.title });
    } else {
      window.open(game.url, '_blank');
    }
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
    // Game window - show game info
    const game = games.find(g => g.id === win.appId);
    if (game) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
          <h3 className="text-lg font-bold text-foreground">{game.title}</h3>
          <p className="text-sm text-muted-foreground">[{game.category}]</p>
          <button
            onClick={() => handleGameClick(game)}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Launch Game
          </button>
        </div>
      );
    }
    return <div className="p-4 text-muted-foreground">Unknown app</div>;
  };

  const wallpaper = theme === 'macos'
    ? 'bg-gradient-to-br from-[hsl(270,60%,30%)] via-[hsl(300,50%,25%)] to-[hsl(330,60%,30%)]'
    : 'bg-gradient-to-br from-[hsl(220,50%,15%)] via-[hsl(270,40%,20%)] to-[hsl(220,50%,15%)]';

  return (
    <div className={`fixed inset-0 z-[300] ${wallpaper} overflow-hidden select-none`}>
      {/* Desktop Icons */}
      <div className={`absolute ${theme === 'macos' ? 'top-10 right-4' : 'top-4 left-4'} flex flex-col flex-wrap gap-1 max-h-[calc(100vh-80px)]`}>
        {/* System apps */}
        {DESKTOP_APPS.map(app => (
          <DesktopIcon
            key={app.id}
            name={app.name}
            icon={app.icon}
            theme={theme}
            onDoubleClick={() => openWindow(app.id, app.name)}
          />
        ))}

        {/* Separator */}
        <div className="h-2" />

        {/* Games */}
        {games.slice(0, 12).map(game => (
          <DesktopIcon
            key={game.id}
            name={game.title}
            icon="gamepad"
            theme={theme}
            onDoubleClick={() => openWindow(game.id, game.title)}
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
        onWindowClick={handleWindowClick}
        onExitDesktop={onExit}
      />

      {/* Embedded Game overlay */}
      {embeddedGame && (
        <div className="fixed inset-0 z-[600]">
          <GameEmbed url={embeddedGame.url} title={embeddedGame.title} onClose={() => setEmbeddedGame(null)} />
        </div>
      )}
    </div>
  );
}
