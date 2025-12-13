import { X } from 'lucide-react';

interface GameEmbedProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function GameEmbed({ url, title, onClose }: GameEmbedProps) {
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
    </div>
  );
}
