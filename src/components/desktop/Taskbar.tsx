import { useState, useEffect } from 'react';
import { Search, Wifi, Volume2, BatteryFull, ChevronUp, LogOut, Pin, PinOff, Gamepad2, Terminal, Folder, Settings } from 'lucide-react';
import type { DesktopTheme, DesktopWindow, DesktopApp } from './types';
import solarnovaIcon from '@/assets/solarnova-icon.png';

interface TaskbarProps {
  theme: DesktopTheme;
  windows: DesktopWindow[];
  pinnedApps: string[];
  allApps: DesktopApp[];
  onWindowClick: (id: string) => void;
  onAppLaunch: (id: string, name: string) => void;
  onUnpin: (id: string) => void;
  onExitDesktop: () => void;
}

const APP_ICONS: Record<string, React.ReactNode> = {
  terminal: <Terminal className="w-4 h-4" />,
  folder: <Folder className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  gamepad: <Gamepad2 className="w-4 h-4" />,
};

export function Taskbar({ theme, windows, pinnedApps, allApps, onWindowClick, onAppLaunch, onUnpin, onExitDesktop }: TaskbarProps) {
  const [time, setTime] = useState(new Date());
  const [showTray, setShowTray] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appId: string; appName: string; isPinned: boolean } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const handleContextMenu = (e: React.MouseEvent, appId: string, appName: string, isPinned: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY - 60, appId, appName, isPinned });
  };

  // Get pinned apps that don't have open windows
  const pinnedNotOpen = pinnedApps.filter(id => !windows.some(w => w.appId === id));
  const pinnedAppDetails = pinnedNotOpen.map(id => allApps.find(a => a.id === id)).filter(Boolean) as DesktopApp[];

  if (theme === 'macos') {
    return (
      <>
        {/* Top menu bar */}
        <div className="fixed top-0 left-0 right-0 h-7 z-[500] bg-black/50 backdrop-blur-xl flex items-center justify-between px-4 text-[13px] text-white/90 font-medium">
          <div className="flex items-center gap-4">
            <span className="font-bold">☀ SolarnovaOS</span>
            <span className="text-white/60">File</span>
            <span className="text-white/60">Edit</span>
            <span className="text-white/60">View</span>
          </div>
          <div className="flex items-center gap-3">
            <Wifi className="w-3.5 h-3.5 text-white/70" />
            <Volume2 className="w-3.5 h-3.5 text-white/70" />
            <BatteryFull className="w-3.5 h-3.5 text-white/70" />
            <span>{formatTime(time)}</span>
          </div>
        </div>

        {/* Bottom dock */}
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[500] flex items-end gap-1 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl">
          {/* Pinned apps (not open) */}
          {pinnedAppDetails.map(app => (
            <button
              key={app.id}
              onClick={() => onAppLaunch(app.id, app.name)}
              onContextMenu={(e) => handleContextMenu(e, app.id, app.name, true)}
              className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center hover:scale-110 transition-transform"
              title={app.name}
            >
              {APP_ICONS[app.icon] || <span className="text-lg">🪟</span>}
            </button>
          ))}
          {pinnedAppDetails.length > 0 && windows.length > 0 && <div className="w-px h-8 bg-white/20 mx-1" />}
          {/* Open windows */}
          {windows.map(w => (
            <button
              key={w.id}
              onClick={() => onWindowClick(w.id)}
              onContextMenu={(e) => handleContextMenu(e, w.appId, w.title, pinnedApps.includes(w.appId))}
              className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center hover:scale-110 transition-transform relative"
              title={w.title}
            >
              {APP_ICONS[allApps.find(a => a.id === w.appId)?.icon || ''] || <span className="text-lg">🪟</span>}
              <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          ))}
          <div className="w-px h-8 bg-white/20 mx-1" />
          <button
            onClick={onExitDesktop}
            className="w-12 h-12 rounded-xl bg-gradient-to-b from-red-500/30 to-red-600/20 border border-red-400/20 flex items-center justify-center hover:scale-110 transition-transform"
            title="Exit to Solarnova"
          >
            <LogOut className="w-5 h-5 text-red-300" />
          </button>
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div
            className="fixed z-[600] bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { onUnpin(contextMenu.appId); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-left text-sm text-white/90 hover:bg-white/10 flex items-center gap-2"
            >
              {contextMenu.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {contextMenu.isPinned ? 'Unpin from Dock' : 'Pin to Dock'}
            </button>
          </div>
        )}
      </>
    );
  }

  // Windows 11 style taskbar
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-12 z-[500] bg-[hsl(220,20%,10%)]/90 backdrop-blur-xl border-t border-white/10 flex items-center px-3">
        <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
          <img src={solarnovaIcon} alt="" className="w-5 h-5" />
        </button>

        <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground w-48">
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </div>

        {/* Pinned + Open windows */}
        <div className="flex-1 flex items-center gap-1 ml-3">
          {pinnedAppDetails.map(app => (
            <button
              key={app.id}
              onClick={() => onAppLaunch(app.id, app.name)}
              onContextMenu={(e) => handleContextMenu(e, app.id, app.name, true)}
              className="px-3 py-1.5 rounded-md text-xs bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              {APP_ICONS[app.icon] || null}
              {app.name.length > 15 ? app.name.slice(0, 15) + '…' : app.name}
            </button>
          ))}
          {windows.map(w => (
            <button
              key={w.id}
              onClick={() => onWindowClick(w.id)}
              onContextMenu={(e) => handleContextMenu(e, w.appId, w.title, pinnedApps.includes(w.appId))}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 ${
                w.isMinimized ? 'bg-white/5 text-muted-foreground' : 'bg-white/10 text-foreground border-b-2 border-primary'
              }`}
            >
              {APP_ICONS[allApps.find(a => a.id === w.appId)?.icon || ''] || null}
              {w.title.length > 15 ? w.title.slice(0, 15) + '…' : w.title}
            </button>
          ))}
        </div>

        {/* System tray */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => setShowTray(!showTray)} className="p-1 hover:bg-white/10 rounded">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <Wifi className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <BatteryFull className="w-3.5 h-3.5" />
          <div className="text-right pl-2">
            <div className="text-[11px]">{formatTime(time)}</div>
            <div className="text-[10px] text-muted-foreground/70">{formatDate(time)}</div>
          </div>
          <button
            onClick={onExitDesktop}
            className="ml-2 p-1.5 hover:bg-destructive/20 rounded transition-colors"
            title="Exit to Solarnova"
          >
            <LogOut className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>

        {showTray && (
          <div className="absolute bottom-14 right-4 bg-[hsl(220,20%,12%)] border border-white/10 rounded-xl p-4 shadow-2xl w-72">
            <div className="text-sm text-foreground mb-2">Quick Settings</div>
            <div className="grid grid-cols-3 gap-2">
              <button className="p-3 rounded-lg bg-primary/20 text-primary text-xs flex flex-col items-center gap-1">
                <Wifi className="w-4 h-4" />
                Connected
              </button>
              <button className="p-3 rounded-lg bg-white/5 text-muted-foreground text-xs flex flex-col items-center gap-1">
                <Volume2 className="w-4 h-4" />
                100%
              </button>
              <button className="p-3 rounded-lg bg-white/5 text-muted-foreground text-xs flex flex-col items-center gap-1">
                <BatteryFull className="w-4 h-4" />
                99%
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[600] bg-[hsl(220,20%,12%)] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { onUnpin(contextMenu.appId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
          >
            {contextMenu.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            {contextMenu.isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
          </button>
        </div>
      )}
    </>
  );
}
