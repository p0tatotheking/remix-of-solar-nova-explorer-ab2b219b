import { X, Users, AlertTriangle, Shield } from 'lucide-react';
import { GameOverlayBar } from './GameOverlayBar';
import { useState, useEffect, useRef, useCallback } from 'react';
import { WatchPartyOverlay } from './WatchPartyOverlay';
import { AgeVerificationModal, useAgeVerification } from './AgeVerificationModal';
import { isBlockedContent } from '@/lib/blockedContentIds';
import { toast } from 'sonner';

interface TVMoviesPlayerProps {
  onClose: () => void;
}

export function TVMoviesPlayer({ onClose }: TVMoviesPlayerProps) {
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
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

  // Monitor iframe URL changes for blocked content
  const checkIframeUrl = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Try to get the current URL (may fail due to cross-origin)
        try {
          const currentUrl = iframe.contentWindow.location.href;
          const result = isBlockedContent(currentUrl);
          if (result.blocked) {
            setIsBlocked(true);
            setViolationCount(prev => {
              const newCount = prev + 1;
              if (newCount >= 3) {
                toast.error('Multiple content policy violations. Session terminated.');
                setTimeout(() => {
                  window.location.href = 'https://www.google.com';
                }, 1000);
              } else {
                toast.error(result.reason || 'This content is restricted');
              }
              return newCount;
            });
          } else {
            setIsBlocked(false);
          }
        } catch {
          // Cross-origin error - can't access iframe URL directly
        }
      }
    } catch {
      // Silent fail for cross-origin issues
    }
  }, []);

  // Poll for URL changes (since we can't always detect cross-origin navigations)
  useEffect(() => {
    const interval = setInterval(checkIframeUrl, 2000);
    return () => clearInterval(interval);
  }, [checkIframeUrl]);

  // Listen for messages from iframe (if the streaming site supports it)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message contains navigation info
      if (event.data && typeof event.data === 'object' && event.data.url) {
        const result = isBlockedContent(event.data.url);
        if (result.blocked) {
          setIsBlocked(true);
          setViolationCount(prev => prev + 1);
          toast.error(result.reason || 'This content is restricted');
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Monitor for content filter violations
  useEffect(() => {
    if (violationCount >= 3) {
      toast.error('Multiple content policy violations detected. Session terminated.');
      setTimeout(() => {
        window.location.href = 'https://www.google.com';
      }, 1500);
    }
  }, [violationCount]);

  const handleAgeConfirm = () => {
    handleConfirm();
    setIsVerified(true);
    setShowAgeVerification(false);
  };

  const handleAgeDeny = () => {
    handleDeny();
  };

  // Show age verification if not verified
  if (showAgeVerification && !isVerified) {
    return <AgeVerificationModal onConfirm={handleAgeConfirm} onDeny={handleAgeDeny} />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-lg border-b border-border/30 flex items-center justify-between px-4 z-20">
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
      <div className="absolute top-14 left-0 right-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 z-10">
        <div className="flex items-center justify-center gap-2 text-amber-500 text-sm">
          <Shield className="w-4 h-4" />
          <span>Content is monitored. NSFW/explicit content is blocked.</span>
        </div>
      </div>

      {/* Third-Party Disclaimer Banner */}
      <div className="absolute top-[6.5rem] left-0 right-0 bg-muted/50 border-b border-border/30 px-4 py-2 z-10">
        <p className="text-center text-xs text-muted-foreground">
          <span className="font-medium">Disclaimer:</span> This content is provided through a third-party embedded service. Solarnova does not own, operate, or control the embedded website. 
          We are not responsible for the content, availability, or any issues arising from the use of this third-party service.
        </p>
      </div>

      {/* Blocked Content Overlay */}
      {isBlocked && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Content Blocked</h2>
            <p className="text-muted-foreground">
              This content has been restricted due to our content policy. 
              Please navigate to appropriate content.
            </p>
            <button
              onClick={() => {
                setIsBlocked(false);
                if (iframeRef.current) {
                  iframeRef.current.src = 'https://mathepic.tuvnord.hk/streaming';
                }
              }}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
            >
              Go Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src="https://mathepic.tuvnord.hk/streaming"
        title="TV & Movies"
        className="w-full h-full pt-36"
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
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
