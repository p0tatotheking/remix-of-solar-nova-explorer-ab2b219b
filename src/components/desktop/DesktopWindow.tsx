import { useState, useRef, useCallback } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import type { DesktopTheme, DesktopWindow as WindowType } from './types';

interface DesktopWindowProps {
  window: WindowType;
  theme: DesktopTheme;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
}

export function DesktopWindowComponent({
  window: win,
  theme,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  children,
}: DesktopWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus(win.id);
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y };

    const handleMouseMove = (e: MouseEvent) => {
      onMove(win.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.id, win.x, win.y, onFocus, onMove]);

  if (win.isMinimized) return null;

  const style: React.CSSProperties = win.isMaximized
    ? { top: theme === 'macos' ? 28 : 0, left: 0, right: 0, bottom: theme === 'windows' ? 48 : 0, width: 'auto', height: 'auto' }
    : { top: win.y, left: win.x, width: win.width, height: win.height };

  if (theme === 'macos') {
    return (
      <div
        className="fixed rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
        style={{ ...style, zIndex: win.zIndex }}
        onClick={() => onFocus(win.id)}
      >
        {/* macOS title bar */}
        <div
          className="h-8 bg-[hsl(220,15%,18%)] flex items-center px-3 gap-2 shrink-0 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <button onClick={() => onClose(win.id)} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
          <button onClick={() => onMinimize(win.id)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
          <button onClick={() => onMaximize(win.id)} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
          <span className="flex-1 text-center text-xs text-white/60 font-medium">{win.title}</span>
        </div>
        <div className="flex-1 bg-[hsl(220,15%,10%)] overflow-auto">{children}</div>
      </div>
    );
  }

  // Windows 11 style
  return (
    <div
      className="fixed rounded-lg overflow-hidden shadow-2xl border border-white/10 flex flex-col"
      style={{ ...style, zIndex: win.zIndex }}
      onClick={() => onFocus(win.id)}
    >
      {/* Windows title bar */}
      <div
        className="h-8 bg-[hsl(220,15%,12%)] flex items-center px-3 shrink-0 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <span className="flex-1 text-xs text-foreground/80">{win.title}</span>
        <div className="flex items-center">
          <button onClick={() => onMinimize(win.id)} className="p-1.5 hover:bg-white/10 rounded-sm">
            <Minus className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={() => onMaximize(win.id)} className="p-1.5 hover:bg-white/10 rounded-sm">
            {win.isMaximized ? <Minimize2 className="w-3 h-3 text-muted-foreground" /> : <Maximize2 className="w-3 h-3 text-muted-foreground" />}
          </button>
          <button onClick={() => onClose(win.id)} className="p-1.5 hover:bg-destructive rounded-sm">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-[hsl(220,15%,8%)] overflow-auto">{children}</div>
    </div>
  );
}
