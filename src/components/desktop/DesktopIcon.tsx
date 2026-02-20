import { Gamepad2, Terminal, Settings, FolderOpen, Globe, Music, MessageSquare, Sparkles, Youtube, Paintbrush, Monitor } from 'lucide-react';
import type { DesktopTheme } from './types';

interface DesktopIconProps {
  name: string;
  icon: string;
  theme: DesktopTheme;
  onDoubleClick: () => void;
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

export function DesktopIcon({ name, icon, theme, onDoubleClick }: DesktopIconProps) {
  const IconComponent = ICON_MAP[icon] || Monitor;

  if (theme === 'macos') {
    return (
      <button
        onDoubleClick={onDoubleClick}
        className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-colors select-none w-20"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
          <IconComponent className="w-7 h-7 text-white" />
        </div>
        <span className="text-[11px] text-white font-medium text-center leading-tight drop-shadow-md truncate w-full">
          {name}
        </span>
      </button>
    );
  }

  // Windows 11 style
  return (
    <button
      onDoubleClick={onDoubleClick}
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
}
