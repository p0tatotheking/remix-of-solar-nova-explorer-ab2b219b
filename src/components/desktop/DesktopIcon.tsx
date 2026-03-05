import { useState } from 'react';
import { Gamepad2, Terminal, Settings, FolderOpen, Globe, Music, MessageSquare, Sparkles, Youtube, Paintbrush, Monitor, Pin, PinOff } from 'lucide-react';
import type { DesktopTheme } from './types';

interface DesktopIconProps {
  name: string;
  icon: string;
  theme: DesktopTheme;
  onDoubleClick: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}

const ICON_MAP: Record<string, any> = {
  gamepad: Gamepad2,
  terminal: Terminal,
  settings: Settings,
  folder: FolderOpen,
  globe: Globe,
  music: Music,
  chat: MessageSquare,
  sparkles: Sparkles,
  youtube: Youtube,
  paintbrush: Paintbrush,
  monitor: Monitor,
};

export function DesktopIcon({ name, icon, theme, onDoubleClick, onPin, isPinned }: DesktopIconProps) {
  const IconComponent = ICON_MAP[icon] || Monitor;
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onPin) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
    const close = () => { setShowMenu(false); window.removeEventListener('click', close); };
    setTimeout(() => window.addEventListener('click', close), 0);
  };

  const iconContent = theme === 'macos' ? (
    <button
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-colors select-none w-20"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
        <IconComponent className="w-7 h-7 text-white" />
      </div>
      <span className="text-[11px] text-white font-medium text-center leading-tight drop-shadow-md truncate w-full">
        {name}
      </span>
    </button>
  ) : (
    <button
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-white/10 transition-colors select-none w-20"
    >
      <div className="w-12 h-12 flex items-center justify-center">
        <IconComponent className="w-8 h-8 text-primary" />
      </div>
      <span className="text-[11px] text-foreground font-normal text-center leading-tight truncate w-full">
        {name}
      </span>
    </button>
  );

  return (
    <>
      {iconContent}
      {showMenu && onPin && (
        <div
          className="fixed z-[700] bg-[hsl(220,20%,12%)] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[150px]"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button
            onClick={() => { onPin(); setShowMenu(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-white/10 flex items-center gap-2"
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            {isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
          </button>
        </div>
      )}
    </>
  );
}
