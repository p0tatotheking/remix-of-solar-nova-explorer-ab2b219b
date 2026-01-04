import { X } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';

interface ProxyEmbedProps {
  onClose: () => void;
}

export function ProxyEmbed({ onClose }: ProxyEmbedProps) {
  const proxyUrl = `https://pgqlruiivbpsqxikagdn.supabase.co/functions/v1/web-proxy?path=/browsing`;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-10">
        <h2 className="text-lg font-bold text-foreground">Proxy</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Iframe pointing to our edge function proxy */}
      <iframe
        src={proxyUrl}
        title="Proxy"
        className="w-full h-full pt-14"
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />

      {/* Overlay bar for music and chat */}
      <GameOverlayBar />
    </div>
  );
}
