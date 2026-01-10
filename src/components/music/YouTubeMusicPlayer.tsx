import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, Music2, Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Repeat, Loader2, ChevronDown, ChevronUp, X, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useYouTubeMusic } from '@/contexts/YouTubeMusicContext';
import { toast } from 'sonner';

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
}

const MUSIC_CATEGORIES = [
  { id: 'trending', label: 'Trending', query: '' },
  { id: 'pop', label: 'Pop', query: 'pop music official video' },
  { id: 'hiphop', label: 'Hip-Hop', query: 'hip hop music official video' },
  { id: 'rnb', label: 'R&B', query: 'r&b music official video' },
  { id: 'rock', label: 'Rock', query: 'rock music official video' },
  { id: 'electronic', label: 'Electronic', query: 'electronic music official video' },
  { id: 'latin', label: 'Latin', query: 'latin music official video' },
  { id: 'kpop', label: 'K-Pop', query: 'kpop music official video' },
];

export function YouTubeMusicPlayer() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isLooping,
    setIsLooping,
    progress,
    currentTime,
    duration,
    seekTo,
    setTracks,
    playerReady,
  } = useYouTubeMusic();

  const loadVideos = useCallback(async (category: string, query?: string) => {
    setIsLoading(true);
    try {
      const categoryData = MUSIC_CATEGORIES.find(c => c.id === category);
      const searchTerm = query || categoryData?.query || 'music video';
      
      const action = category === 'trending' && !query ? 'trending' : 'search';
      const body = action === 'trending' 
        ? { action: 'trending', categoryId: '10', maxResults: 30 } // 10 = Music category
        : { action: 'search', query: `${searchTerm} music video`, maxResults: 30 };

      const { data, error } = await supabase.functions.invoke('youtube-api', { body });

      if (error) throw error;

      const items = data.items || [];
      const formattedVideos: YouTubeVideo[] = items.map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || '',
        channelTitle: item.snippet?.channelTitle || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        duration: item.contentDetails?.duration,
      }));

      setVideos(formattedVideos);
      setTracks(formattedVideos.map(v => ({
        id: v.id,
        title: v.title,
        artist: v.channelTitle,
        thumbnail: v.thumbnail,
      })));
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load music');
    }
    setIsLoading(false);
  }, [setTracks]);

  useEffect(() => {
    loadVideos(activeCategory);
  }, [activeCategory, loadVideos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadVideos('search', searchQuery);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
  };

  const handlePlayVideo = (video: YouTubeVideo) => {
    playTrack({
      id: video.id,
      title: video.title,
      artist: video.channelTitle,
      thumbnail: video.thumbnail,
    });
  };

  const toggleFavorite = (videoId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
        toast.success('Removed from favorites');
      } else {
        next.add(videoId);
        toast.success('Added to favorites');
      }
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent);
  };

  const displayVideos = activeCategory === 'favorites' 
    ? videos.filter(v => favorites.has(v.id))
    : videos;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">YouTube Music</h1>
            <p className="text-xs text-muted-foreground">Discover and play music videos</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for music..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/30 rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50"
          />
        </form>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => {
              setActiveCategory('favorites');
              setVideos(videos.filter(v => favorites.has(v.id)));
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === 'favorites'
                ? 'bg-red-500 text-white'
                : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Heart className={`w-4 h-4 inline mr-1 ${activeCategory === 'favorites' ? 'fill-white' : ''}`} />
            Favorites
          </button>
          {MUSIC_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-red-500 text-white'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : displayVideos.length === 0 ? (
          <div className="text-center py-12">
            <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {activeCategory === 'favorites' ? 'No favorites yet' : 'No music found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                className={`group text-left transition-all ${
                  currentTrack?.id === video.id ? 'ring-2 ring-red-500 rounded-xl' : ''
                }`}
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {currentTrack?.id === video.id && isPlaying ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white" />
                    )}
                  </div>
                  {currentTrack?.id === video.id && isPlaying && (
                    <div className="absolute bottom-2 left-2 flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-red-500 rounded-full animate-pulse"
                          style={{
                            height: `${8 + Math.random() * 8}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(video.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.has(video.id) ? 'fill-red-500 text-red-500' : 'text-white'
                      }`}
                    />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.channelTitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Persistent Player Bar */}
      {currentTrack && (
        <div className="flex-shrink-0 border-t border-border/30 bg-background/95 backdrop-blur-lg">
          {/* Progress bar */}
          <div
            className="h-1 bg-muted cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="px-4 py-3 flex items-center gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-lg transition-colors ${
                  isLooping ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat className="w-4 h-4" />
              </button>
              <button
                onClick={playPrevious}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlayPause}
                disabled={!playerReady}
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <button
                onClick={playNext}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Time & Volume */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseInt(e.target.value));
                  setIsMuted(false);
                }}
                className="w-20 accent-red-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
