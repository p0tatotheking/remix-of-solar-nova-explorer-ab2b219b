import { X, Users } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useState } from 'react';
import { WatchPartyOverlay } from './WatchPartyOverlay';

interface TVMoviesPlayerProps {
  onClose: () => void;
}

export function TVMoviesPlayer({ onClose }: TVMoviesPlayerProps) {
  const [showWatchParty, setShowWatchParty] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-10">
        <h2 className="text-lg font-bold text-foreground">TV & Movies</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWatchParty(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Watch Party</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        src="https://mathepic.tuvnord.hk/streaming"
        title="TV & Movies"
        className="w-full h-full pt-14"
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
      />

      {/* Overlay bar for music and chat */}
      <GameOverlayBar />

      {/* Watch Party Modal */}
      {showWatchParty && (
        <WatchPartyOverlay onClose={() => setShowWatchParty(false)} />
      )}
    </div>
  );
}
