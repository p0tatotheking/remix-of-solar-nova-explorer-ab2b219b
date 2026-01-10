import { X } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface GameEmbedProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function GameEmbed({ url, title, onClose }: GameEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Block navigation to streaming URL
  useEffect(() => {
    const checkForStreamingUrl = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          try {
            const currentUrl = iframe.contentWindow.location.href;
            if (currentUrl.includes('/streaming')) {
              toast.error('Unauthorized access attempt detected. Session terminated.');
              setTimeout(() => {
                window.location.href = 'https://www.google.com';
              }, 500);
            }
          } catch {
            // Cross-origin - can't access directly
          }
        }
      } catch {
        // Silent fail
      }
    };

    const interval = setInterval(checkForStreamingUrl, 1000);
    return () => clearInterval(interval);
  }, []);

  // Also block if the initial URL is the streaming URL
  useEffect(() => {
    if (url.includes('/streaming')) {
      toast.error('Unauthorized access attempt detected. Session terminated.');
      setTimeout(() => {
        window.location.href = 'https://www.google.com';
      }, 500);
    }
  }, [url]);

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
        ref={iframeRef}
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
