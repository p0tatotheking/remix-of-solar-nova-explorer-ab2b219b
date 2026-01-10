import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, Flame, Music, Gamepad2, Film, Newspaper, Trophy, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  viewCount?: string;
  publishedAt: string;
  duration?: string;
}

interface WatchHistoryItem {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail: string;
}

interface YouTubeHomeProps {
  onVideoSelect: (videoId: string) => void;
  onShortsClick: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const categories = [
  { id: '10', name: 'Music', icon: Music },
  { id: '20', name: 'Gaming', icon: Gamepad2 },
  { id: '1', name: 'Film', icon: Film },
  { id: '25', name: 'News', icon: Newspaper },
  { id: '17', name: 'Sports', icon: Trophy },
];

export function YouTubeHome({ onVideoSelect, onShortsClick, searchQuery, setSearchQuery }: YouTubeHomeProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [showRecommended, setShowRecommended] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchVideos = async (categoryId?: string, query?: string, pageToken?: string) => {
    if (pageToken) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setVideos([]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: query 
          ? { action: 'search', query, maxResults: 24, pageToken }
          : { action: 'trending', maxResults: 24, categoryId, pageToken }
      });

      if (error) throw error;

      const items = data.items || [];
      const formattedVideos: Video[] = items.map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
        channelTitle: item.snippet?.channelTitle || '',
        viewCount: item.statistics?.viewCount,
        publishedAt: item.snippet?.publishedAt || '',
        duration: item.contentDetails?.duration,
      }));

      if (pageToken) {
        setVideos(prev => [...prev, ...formattedVideos]);
      } else {
        setVideos(formattedVideos);
      }
      
      setNextPageToken(data.nextPageToken || null);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = useCallback(() => {
    if (loadingMore || !nextPageToken) return;
    fetchVideos(activeCategory || undefined, currentQuery || undefined, nextPageToken);
  }, [loadingMore, nextPageToken, activeCategory, currentQuery]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageToken && !loadingMore) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [nextPageToken, loadingMore, loadMoreVideos]);

  // Fetch trending videos and recommendations on mount
  useEffect(() => {
    fetchVideos();
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  // Fetch recommendations based on watch history
  const fetchRecommendations = async () => {
    if (!user) return;
    
    try {
      // Get watch history from database
      const { data: historyData, error: historyError } = await supabase
        .from('youtube_watch_history')
        .select('channel_title, video_id')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(10);

      if (historyError || !historyData || historyData.length === 0) {
        setShowRecommended(false);
        return;
      }

      // Get unique channels from history
      const channels = [...new Set(historyData.map(h => h.channel_title))].slice(0, 3);
      const watchedIds = new Set(historyData.map(h => h.video_id));
      const searchTerm = channels.join(' ');

      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'search', query: searchTerm, maxResults: 16 }
      });

      if (error) throw error;

      const items = data.items || [];
      const formattedVideos: Video[] = items
        .filter((item: any) => !watchedIds.has(item.id?.videoId || item.id))
        .map((item: any) => ({
          id: item.id?.videoId || item.id,
          title: item.snippet?.title || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
          channelTitle: item.snippet?.channelTitle || '',
          viewCount: item.statistics?.viewCount,
          publishedAt: item.snippet?.publishedAt || '',
          duration: item.contentDetails?.duration,
        }))
        .slice(0, 8);

      if (formattedVideos.length > 0) {
        setRecommendedVideos(formattedVideos);
        setShowRecommended(true);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveCategory(null);
      setCurrentQuery(searchQuery);
      setNextPageToken(null);
      fetchVideos(undefined, searchQuery);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery('');
    setCurrentQuery('');
    setNextPageToken(null);
    fetchVideos(categoryId);
  };

  const handleTrendingClick = () => {
    setActiveCategory(null);
    setSearchQuery('');
    setCurrentQuery('');
    setNextPageToken(null);
    fetchVideos();
  };

  const formatViewCount = (count?: string) => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
    return `${num} views`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
    return `${Math.floor(seconds / 31536000)} years ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 bg-muted/50 border-border/50 rounded-full"
            />
          </div>
          <Button type="submit" className="h-11 px-6 rounded-full bg-red-500 hover:bg-red-600">
            Search
          </Button>
        </form>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-border/30">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={handleTrendingClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              !activeCategory && !currentQuery ? 'bg-foreground text-background' : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </button>
          <button
            onClick={onShortsClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap bg-gradient-to-r from-red-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
          >
            <Flame className="w-4 h-4" />
            Shorts
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeCategory === category.id ? 'bg-foreground text-background' : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : (
          <>
            {/* Recommended Section - Only show on home/trending */}
            {showRecommended && !activeCategory && !currentQuery && recommendedVideos.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-foreground">Recommended for you</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recommendedVideos.map((video, index) => (
                    <button
                      key={`rec-${video.id}-${index}`}
                      onClick={() => onVideoSelect(video.id)}
                      className="group text-left rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-foreground line-clamp-2 text-xs mb-1 group-hover:text-amber-500 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{video.channelTitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending/Category Title */}
            {!currentQuery && (
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {activeCategory ? categories.find(c => c.id === activeCategory)?.name : 'Trending'}
              </h2>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video, index) => (
                <button
                  key={`${video.id}-${index}`}
                  onClick={() => onVideoSelect(video.id)}
                  className="group text-left rounded-xl overflow-hidden bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-foreground line-clamp-2 text-sm mb-1 group-hover:text-red-500 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">{video.channelTitle}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {video.viewCount && <span>{formatViewCount(video.viewCount)}</span>}
                      {video.viewCount && video.publishedAt && <span>•</span>}
                      {video.publishedAt && <span>{formatTimeAgo(video.publishedAt)}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {loadingMore && (
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              )}
              {!loadingMore && nextPageToken && (
                <button
                  onClick={loadMoreVideos}
                  className="px-6 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm text-foreground transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          </>
        )}

        {!loading && videos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No videos found</p>
          </div>
        )}
      </div>
    </div>
  );
}