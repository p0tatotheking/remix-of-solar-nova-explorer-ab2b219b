import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Youtube, Play, Link2, X, Maximize2, Volume2, Clock, Sparkles, PictureInPicture2, Minimize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoHistory {
  id: string;
  title: string;
  thumbnail: string;
  timestamp: number;
}

interface PipContextType {
  pipVideo: { id: string; title: string } | null;
  setPipVideo: (video: { id: string; title: string } | null) => void;
}

const PipContext = createContext<PipContextType | null>(null);

export function PipProvider({ children }: { children: React.ReactNode }) {
  const [pipVideo, setPipVideo] = useState<{ id: string; title: string } | null>(null);
  return (
    <PipContext.Provider value={{ pipVideo, setPipVideo }}>
      {children}
    </PipContext.Provider>
  );
}

export function usePip() {
  const context = useContext(PipContext);
  if (!context) {
    throw new Error('usePip must be used within a PipProvider');
  }
  return context;
}

// Floating PiP Player Component
export function FloatingPipPlayer() {
  const { pipVideo, setPipVideo } = usePip();
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('iframe')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + deltaX)),
        y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + deltaY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!pipVideo) return null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`fixed z-[100] transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ right: position.x, bottom: position.y }}
    >
      <div className={`bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isMinimized ? 'w-48' : 'w-80'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-500/20 to-transparent border-b border-border/30">
          <div className="flex items-center gap-2 min-w-0">
            <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">PiP Mode</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setPipVideo(null)}
              className="p-1 hover:bg-destructive/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {/* Video */}
        {!isMinimized && (
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${pipVideo.id}?autoplay=1&rel=0&modestbranding=1`}
              title="YouTube PiP player"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Minimized state */}
        {isMinimized && (
          <div className="p-2 flex items-center gap-2">
            <img
              src={`https://img.youtube.com/vi/${pipVideo.id}/default.jpg`}
              alt="Thumbnail"
              className="w-10 h-10 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">Now Playing</p>
              <button
                onClick={() => setIsMinimized(false)}
                className="text-[10px] text-primary hover:underline"
              >
                Expand
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function YouTubePlayer() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<VideoHistory[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  let pipContext: PipContextType | null = null;
  try {
    pipContext = usePip();
  } catch {
    // PipProvider not available
  }

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('youtube-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history');
      }
    }
  }, []);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (inputUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = inputUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handlePlay = () => {
    const id = extractVideoId(url.trim());
    if (id) {
      setVideoId(id);
      setIsPlaying(true);
      
      // Add to history
      const newEntry: VideoHistory = {
        id,
        title: `Video ${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        timestamp: Date.now()
      };
      
      const updatedHistory = [newEntry, ...history.filter(h => h.id !== id)].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('youtube-history', JSON.stringify(updatedHistory));
      
      toast.success('Video loaded!');
    } else {
      toast.error('Invalid YouTube URL');
    }
  };

  const handleHistoryClick = (id: string) => {
    setVideoId(id);
    setIsPlaying(true);
    setUrl(`https://youtube.com/watch?v=${id}`);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('youtube-history');
    toast.success('History cleared');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const enablePip = () => {
    if (videoId && pipContext) {
      pipContext.setPipVideo({ id: videoId, title: `Video ${videoId}` });
      setIsPlaying(false);
      setVideoId(null);
      toast.success('Picture-in-Picture enabled! Video will continue playing while you browse.');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20">
            <Youtube className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">YouTube Player</h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-base">
          Paste any YouTube URL to watch videos right here
        </p>
      </div>

      {/* URL Input Section */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-primary/20 to-red-500/20 blur-xl opacity-50 rounded-3xl" />
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
                className="pl-12 h-12 md:h-14 text-base bg-background/50 border-border/50 rounded-xl focus:border-red-500/50 focus:ring-red-500/20"
              />
            </div>
            <Button
              onClick={handlePlay}
              disabled={!url.trim()}
              className="h-12 md:h-14 px-6 md:px-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              <Play className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Play Video</span>
              <span className="sm:hidden">Play</span>
            </Button>
          </div>
          
          {/* Quick tips */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-full">
              <Sparkles className="w-3 h-3" /> Supports youtube.com
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-full">
              <Sparkles className="w-3 h-3" /> Supports youtu.be
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-full">
              <PictureInPicture2 className="w-3 h-3" /> PiP Mode
            </span>
          </div>
        </div>
      </div>

      {/* Video Player */}
      {videoId && isPlaying && (
        <div ref={containerRef} className="mb-8">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Control buttons */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {pipContext && (
                <button
                  onClick={enablePip}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                  title="Picture-in-Picture"
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setVideoId(null);
              }}
              className="absolute top-4 left-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube video player"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!videoId && !isPlaying && (
        <div className="relative mb-8">
          <div className="aspect-video max-w-4xl mx-auto bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-2xl flex flex-col items-center justify-center p-8">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <Youtube className="w-12 h-12 text-red-500/60" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">No Video Playing</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Paste a YouTube URL above to start watching. Your recent videos will appear below.
            </p>
          </div>
        </div>
      )}

      {/* Watch History */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Recent Videos
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {history.map((video) => (
              <button
                key={video.id}
                onClick={() => handleHistoryClick(video.id)}
                className="group relative aspect-video rounded-xl overflow-hidden bg-muted/30 border border-border/50 hover:border-red-500/50 transition-all duration-300 hover:scale-[1.02]"
              >
                <img
                  src={video.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="p-3 rounded-full bg-red-500 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
            <Play className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Instant Play</h3>
          <p className="text-xs text-muted-foreground">Paste and play any YouTube video instantly</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
            <PictureInPicture2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Picture-in-Picture</h3>
          <p className="text-xs text-muted-foreground">Watch while browsing other sections</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
            <Volume2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Full Controls</h3>
          <p className="text-xs text-muted-foreground">All YouTube player controls at your fingertips</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
            <Maximize2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Fullscreen</h3>
          <p className="text-xs text-muted-foreground">Watch in fullscreen for immersive viewing</p>
        </div>
      </div>
    </div>
  );
}
