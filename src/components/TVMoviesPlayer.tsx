import { X, Users, AlertTriangle } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useState, useEffect, useRef } from 'react';
import { WatchPartyOverlay } from './WatchPartyOverlay';
import { AgeVerificationModal, useAgeVerification } from './AgeVerificationModal';
import { validateSearch } from '@/lib/contentFilter';
import { toast } from 'sonner';

interface TVMoviesPlayerProps {
  onClose: () => void;
}

export function TVMoviesPlayer({ onClose }: TVMoviesPlayerProps) {
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { handleConfirm, handleDeny } = useAgeVerification();

  // Check age verification on mount
  useEffect(() => {
    const STORAGE_KEY = 'tv_movies_age_verified';
    const verified = sessionStorage.getItem(STORAGE_KEY) === 'true';
    if (verified) {
      setIsVerified(true);
    } else {
      setShowAgeVerification(true);
    }
  }, []);

  // Monitor iframe URL changes for content filtering
  useEffect(() => {
    if (!isVerified || !iframeRef.current) return;

    const checkIframeContent = () => {
      try {
        // We can't directly access cross-origin iframe content
        // But we can listen for messages from the iframe if it cooperates
        // For now, we'll rely on the initial URL check
      } catch {
        // Cross-origin restrictions prevent access
      }
    };

    const interval = setInterval(checkIframeContent, 2000);
    return () => clearInterval(interval);
  }, [isVerified]);

  // Monitor for content filter violations
  useEffect(() => {
    if (violationCount >= 3) {
      // Too many violations - close the page
      toast.error('Multiple content policy violations detected. Session terminated.');
      setTimeout(() => {
        window.location.href = 'https://www.google.com';
      }, 1500);
    }
  }, [violationCount]);

  // Listen for messages from iframe (if the streaming site sends them)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'search') {
        const searchText = event.data.query;
        const result = validateSearch(searchText);
        
        if (!result.valid) {
          if (result.shouldClose) {
            toast.error(result.message);
            setTimeout(() => {
              window.location.href = 'https://www.google.com';
            }, 1000);
          } else {
            setViolationCount(prev => prev + 1);
            toast.error(result.message);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAgeConfirm = () => {
    handleConfirm();
    setIsVerified(true);
    setShowAgeVerification(false);
  };

  const handleAgeDeny = () => {
    handleDeny();
    // This will redirect to Google
  };

  // Show age verification if not verified
  if (showAgeVerification && !isVerified) {
    return <AgeVerificationModal onConfirm={handleAgeConfirm} onDeny={handleAgeDeny} />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">TV & Movies</h2>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-medium">
            18+
          </span>
        </div>
        <div className="flex items-center gap-2">
          {violationCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{3 - violationCount} warnings left</span>
            </div>
          )}
          <button
            onClick={() => setShowWatchParty(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Watch Party</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content Policy Banner */}
      <div className="absolute top-14 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-amber-500">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            Content Policy: Searching for or accessing adult, explicit, or NSFW content is strictly prohibited and will result in immediate session termination.
          </span>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src="https://mathepic.tuvnord.hk/streaming"
        title="TV & Movies"
        className="w-full h-full pt-[88px]"
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
