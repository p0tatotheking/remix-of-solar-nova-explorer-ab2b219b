import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Short {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface YouTubeShortsProps {
  onBack: () => void;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function YouTubeShorts({ onBack }: YouTubeShortsProps) {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'shorts', query: 'trending shorts', maxResults: 20 }
      });

      if (error) throw error;

      const items = data.items || [];
      const formattedShorts: Short[] = items.map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || '',
        channelTitle: item.snippet?.channelTitle || '',
      }));

      // Shuffle the shorts for random order
      setShorts(shuffleArray(formattedShorts));
    } catch (error: any) {
      console.error('Error fetching shorts:', error);
      toast.error('Failed to load Shorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, []);

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    setCurrentIndex(prev => {
      if (direction === 'up' && prev > 0) {
        return prev - 1;
      } else if (direction === 'down' && prev < shorts.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [shorts.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleScroll('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleScroll('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScroll]);

  // Handle wheel scroll - prevent page scroll and navigate shorts instead
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.deltaY > 0) {
        handleScroll('down');
      } else if (e.deltaY < 0) {
        handleScroll('up');
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleScroll]);

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleShare = async (short: Short) => {
    try {
      await navigator.clipboard.writeText(`https://youtube.com/shorts/${short.id}`);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  const currentShort = shorts[currentIndex];

  return (
    <div ref={containerRef} className="relative h-full bg-black flex items-center justify-center">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Navigation Arrows */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        <button
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleScroll('down')}
          disabled={currentIndex === shorts.length - 1}
          className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors disabled:opacity-30"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Short Video */}
      {currentShort && (
        <div className="relative w-full max-w-[400px] h-full max-h-[90vh] bg-black rounded-xl overflow-hidden">
          {/* Video Player */}
          <div className="absolute inset-0">
            <iframe
              src={`https://www.youtube.com/embed/${currentShort.id}?autoplay=1&loop=1&playlist=${currentShort.id}&controls=0&modestbranding=1&rel=0${muted ? '&mute=1' : ''}`}
              title={currentShort.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>

          {/* Overlay Controls */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Mute Button */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
              <p className="text-white font-semibold mb-1">@{currentShort.channelTitle}</p>
              <p className="text-white/90 text-sm line-clamp-2">{currentShort.title}</p>
            </div>

            {/* Side Actions */}
            <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4 pointer-events-auto">
              <button
                onClick={() => toggleLike(currentShort.id)}
                className="flex flex-col items-center gap-1"
              >
                <div className={`p-3 rounded-full ${liked.has(currentShort.id) ? 'bg-red-500' : 'bg-black/50'} hover:bg-black/70 transition-colors`}>
                  <Heart className={`w-6 h-6 ${liked.has(currentShort.id) ? 'text-white fill-white' : 'text-white'}`} />
                </div>
                <span className="text-white text-xs">Like</span>
              </button>
              
              <button className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Comment</span>
              </button>
              
              <button
                onClick={() => handleShare(currentShort)}
                className="flex flex-col items-center gap-1"
              >
                <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs">Share</span>
              </button>
              
              <button className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                  <MoreVertical className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="absolute top-2 left-4 right-4 flex gap-1">
            {shorts.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-4 text-white/70 text-sm">
        {currentIndex + 1} / {shorts.length}
      </div>
    </div>
  );
}
