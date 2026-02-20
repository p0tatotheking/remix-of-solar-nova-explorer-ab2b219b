import { useState, useEffect } from 'react';
import { Search, Wifi, Volume2, BatteryFull, ChevronUp, LogOut } from 'lucide-react';
import type { DesktopTheme, DesktopWindow } from './types';
import solarnovaIcon from '@/assets/solarnova-icon.png';

interface TaskbarProps {
  theme: DesktopTheme;
  windows: DesktopWindow[];
  onWindowClick: (id: string) => void;
  onExitDesktop: () => void;
}

export function Taskbar({ theme, windows, onWindowClick, onExitDesktop }: TaskbarProps) {
  const [time, setTime] = useState(new Date());
  const [showTray, setShowTray] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  if (theme === 'macos') {
    // macOS-style top menu bar + bottom dock
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
          {windows.filter(w => !w.isMinimized).map(w => (
            <button
              key={w.id}
              onClick={() => onWindowClick(w.id)}
              className="w-12 h-12 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/10 flex items-center justify-center hover:scale-110 transition-transform"
              title={w.title}
            >
              <span className="text-lg">🪟</span>
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
      </>
    );
  }

  // Windows 11 style taskbar
  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 z-[500] bg-[hsl(220,20%,10%)]/90 backdrop-blur-xl border-t border-white/10 flex items-center px-3">
      {/* Start button */}
      <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
        <img src={solarnovaIcon} alt="" className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-muted-foreground w-48">
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
      </div>

      {/* Open windows */}
      <div className="flex-1 flex items-center gap-1 ml-3">
        {windows.map(w => (
          <button
            key={w.id}
            onClick={() => onWindowClick(w.id)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              w.isMinimized ? 'bg-white/5 text-muted-foreground' : 'bg-white/10 text-foreground border-b-2 border-primary'
            }`}
          >
            {w.title}
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

      {/* Tray popup */}
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
  );
}
