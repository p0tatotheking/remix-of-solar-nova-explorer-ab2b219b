import { useState, useEffect } from 'react';
import { ArrowLeft, History, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail: string | null;
  watched_at: string;
}

interface RecommendedVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface YouTubeHistoryProps {
  onVideoSelect: (videoId: string) => void;
  onBack: () => void;
}

export function YouTubeHistory({ onVideoSelect, onBack }: YouTubeHistoryProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('youtube_watch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (data) {
        setHistory(data);
        
        // Get recommendations based on history
        if (data.length > 0) {
          fetchRecommendations(data);
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (historyItems: HistoryItem[]) => {
    setLoadingRecs(true);
    try {
      // Get unique channel names and recent video titles for better recommendations
      const channels = [...new Set(historyItems.slice(0, 5).map(h => h.channel_title))];
      const recentTitles = historyItems.slice(0, 3).map(h => h.title);
      
      // Create a search query based on user's watch history
      const searchTerms = channels.slice(0, 2).join(' ');
      
      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: { 
          action: 'search', 
          query: searchTerms + ' music video', 
          maxResults: 12 
        }
      });

      if (error) throw error;

      const watchedIds = new Set(historyItems.map(h => h.video_id));
      const items = (data.items || [])
        .filter((item: any) => !watchedIds.has(item.id?.videoId || item.id))
        .slice(0, 8);

      const formatted: RecommendedVideo[] = items.map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
        channelTitle: item.snippet?.channelTitle || '',
      }));

      setRecommendations(formatted);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecs(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('youtube_watch_history')
        .delete()
        .eq('user_id', user.id);
      
      setHistory([]);
      setRecommendations([]);
      toast.success('History cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    }
  };

  const removeFromHistory = async (videoId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('youtube_watch_history')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);
      
      setHistory(prev => prev.filter(h => h.video_id !== videoId));
      toast.success('Removed from history');
    } catch (error) {
      console.error('Error removing from history:', error);
      toast.error('Failed to remove');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" />
            <h1 className="text-xl font-bold text-foreground">Watch History</h1>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-foreground">Recommended for you</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recommendations.map((video) => (
              <button
                key={video.id}
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
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-foreground line-clamp-2 text-xs group-hover:text-red-500 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{video.channelTitle}</p>
                </div>
              </button>
            ))}
          </div>
          {loadingRecs && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            </div>
          )}
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No watch history yet</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Videos you watch will appear here
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recently watched</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <button
                  onClick={() => onVideoSelect(item.video_id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.thumbnail || '/placeholder.svg'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground line-clamp-2 text-sm group-hover:text-red-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.channel_title}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatTimeAgo(item.watched_at)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => removeFromHistory(item.video_id)}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
