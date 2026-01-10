import { X } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface GameEmbedProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function GameEmbed({ url, title, onClose }: GameEmbedProps) {
  // NOTE: We cannot reliably detect in-iframe navigation for cross-origin sites.
  // So we hard-block this domain from being opened as a "game" embed.
  const isRestrictedMathepicEmbed = useMemo(() => {
    try {
      const u = new URL(url);
      return u.hostname === 'mathepic.tuvnord.hk';
    } catch {
      return false;
    }
  }, [url]);

  useEffect(() => {
    if (!isRestrictedMathepicEmbed) return;

    toast.error('Restricted embed detected. Closing site.');
    const t = window.setTimeout(() => {
      window.location.replace('https://www.google.com');
    }, 500);

    return () => window.clearTimeout(t);
  }, [isRestrictedMathepicEmbed]);

  if (isRestrictedMathepicEmbed) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Restricted Embed</h2>
          <p className="text-sm text-muted-foreground">
            This site cannot be opened from Games. Please use the TV & Movies section instead. Closing…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-10">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Iframe */}
      <iframe
        src={url}
        title={title}
        className="w-full h-full pt-14"
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
      />

      {/* Overlay bar for music and chat */}
      <GameOverlayBar />
    </div>
  );
}
