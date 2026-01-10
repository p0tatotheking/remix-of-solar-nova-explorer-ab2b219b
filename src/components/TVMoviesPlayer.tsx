import { X, Users, AlertTriangle, Search, Shield } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchOverlay, setShowSearchOverlay] = useState(true);
  const [iframeUrl, setIframeUrl] = useState('https://mathepic.tuvnord.hk/streaming');
  const [lastValidSearch, setLastValidSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // Real-time validation as user types
  useEffect(() => {
    if (searchQuery.length > 2) {
      const result = validateSearch(searchQuery);
      if (!result.valid) {
        if (result.shouldClose) {
          toast.error('Filter bypass attempt detected. Session terminated.');
          setTimeout(() => {
            window.location.href = 'https://www.google.com';
          }, 1000);
        }
      }
    }
  }, [searchQuery]);

  // Monitor for content filter violations
  useEffect(() => {
    if (violationCount >= 3) {
      toast.error('Multiple content policy violations detected. Session terminated.');
      setTimeout(() => {
        window.location.href = 'https://www.google.com';
      }, 1500);
    }
  }, [violationCount]);

  // Intercept keyboard to show search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user presses any letter/number key, show search overlay
      if (!showSearchOverlay && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        setShowSearchOverlay(true);
        setSearchQuery(e.key);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      
      // Escape closes search overlay
      if (e.key === 'Escape' && showSearchOverlay) {
        setShowSearchOverlay(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchOverlay]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;

    const result = validateSearch(searchQuery);
    
    if (!result.valid) {
      if (result.shouldClose) {
        toast.error(result.message || 'Session terminated.');
        setTimeout(() => {
          window.location.href = 'https://www.google.com';
        }, 1000);
        return;
      }
      
      setViolationCount(prev => prev + 1);
      toast.error(result.message || 'This search is not allowed');
      setSearchQuery('');
      return;
    }

    // Valid search - update iframe URL with search
    setLastValidSearch(searchQuery);
    setIframeUrl(`https://mathepic.tuvnord.hk/streaming?search=${encodeURIComponent(searchQuery)}`);
    setShowSearchOverlay(false);
    setSearchQuery('');
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Real-time check for immediate violations
    if (value.length > 2) {
      const result = validateSearch(value);
      if (result.shouldClose) {
        toast.error('Filter bypass attempt detected. Session terminated.');
        setTimeout(() => {
          window.location.href = 'https://www.google.com';
        }, 800);
      }
    }
  };

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
        
        {/* Search button in header */}
        <div className="flex-1 flex justify-center max-w-md mx-4">
          <button
            onClick={() => {
              setShowSearchOverlay(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/30 text-muted-foreground text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>{lastValidSearch || 'Search movies & TV shows...'}</span>
          </button>
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

      {/* Search Overlay */}
      {showSearchOverlay && (
        <div 
          className="absolute inset-0 z-30 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchOverlay(false);
              setSearchQuery('');
            }
          }}
        >
          <div className="w-full max-w-2xl space-y-6">
            {/* Search Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Shield className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Safe Search</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                All searches are monitored for policy compliance
              </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search movies & TV shows..."
                className="w-full px-12 py-4 bg-muted/30 border border-border/50 rounded-xl text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
              >
                Search
              </button>
            </form>

            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-500 mb-1">Content Policy</p>
                  <p className="text-muted-foreground">
                    Searching for adult, explicit, pornographic, or NSFW content is strictly prohibited. 
                    Attempts to bypass content filters will result in immediate session termination. 
                    This includes using spaces, special characters, or alternative spellings.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setShowSearchOverlay(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              {lastValidSearch && (
                <button
                  onClick={() => {
                    setIframeUrl('https://mathepic.tuvnord.hk/streaming');
                    setLastValidSearch('');
                    setShowSearchOverlay(false);
                  }}
                  className="px-4 py-2 text-primary hover:text-primary/80 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="TV & Movies"
        className="w-full h-full pt-14"
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
