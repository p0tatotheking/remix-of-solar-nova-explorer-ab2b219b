import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Loader2, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { YouTubeWatchParty } from './YouTubeWatchParty';
import { useAuth } from '@/contexts/AuthContext';

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
  thumbnail: string;
}

interface RelatedVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface YouTubeWatchProps {
  videoId: string;
  onBack: () => void;
  onVideoSelect: (videoId: string) => void;
}

export function YouTubeWatch({ videoId, onBack, onVideoSelect }: YouTubeWatchProps) {
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save to watch history in database
  const saveToHistory = async (videoData: VideoDetails) => {
    if (!user) return;
    
    try {
      // First, check if this video is already in history
      const { data: existing } = await supabase
        .from('youtube_watch_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoData.id)
        .single();

      if (existing) {
        // Update watched_at timestamp
        await supabase
          .from('youtube_watch_history')
          .update({ watched_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Insert new entry
        await supabase
          .from('youtube_watch_history')
          .insert({
            user_id: user.id,
            video_id: videoData.id,
            title: videoData.title,
            channel_title: videoData.channelTitle,
            thumbnail: videoData.thumbnail,
          });
      }
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const fetchVideoDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'video', videoId }
      });

      if (error) throw error;

      const item = data.items?.[0];
      if (item) {
        const videoData = {
          id: item.id,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          channelTitle: item.snippet?.channelTitle || '',
          channelId: item.snippet?.channelId || '',
          viewCount: item.statistics?.viewCount || '0',
          likeCount: item.statistics?.likeCount || '0',
          publishedAt: item.snippet?.publishedAt || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || '',
        };
        setVideo(videoData);
        
        // Save to watch history
        saveToHistory(videoData);
      }

      // Fetch related videos using search
      const { data: relatedData } = await supabase.functions.invoke('youtube-api', {
        body: { action: 'search', query: item?.snippet?.title?.split(' ').slice(0, 3).join(' ') || '', maxResults: 10 }
      });

      if (relatedData?.items) {
        const related: RelatedVideo[] = relatedData.items
          .filter((r: any) => (r.id?.videoId || r.id) !== videoId)
          .map((r: any) => ({
            id: r.id?.videoId || r.id,
            title: r.snippet?.title || '',
            thumbnail: r.snippet?.thumbnails?.medium?.url || '',
            channelTitle: r.snippet?.channelTitle || '',
          }));
        setRelatedVideos(related);
      }
    } catch (error: any) {
      console.error('Error fetching video:', error);
      toast.error('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoDetails();
  }, [videoId]);

  const formatCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://youtube.com/watch?v=${videoId}`);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Main Video Section */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto">
        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black flex-shrink-0">
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
              title={video?.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        {/* Video Info */}
        <div className="flex-1 overflow-y-auto p-4">
          {video && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{formatCount(video.viewCount)} views</span>
                <span>•</span>
                <span>{formatDate(video.publishedAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" className="gap-2 rounded-full">
                  <ThumbsUp className="w-5 h-5" />
                  {formatCount(video.likeCount)}
                </Button>
                <Button variant="ghost" className="gap-2 rounded-full">
                  <ThumbsDown className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="gap-2 rounded-full" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
                <Button variant="ghost" className="gap-2 rounded-full">
                  <Download className="w-5 h-5" />
                  Download
                </Button>
                <Button 
                  variant="ghost" 
                  className="gap-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                  onClick={() => setShowWatchParty(true)}
                >
                  <Users className="w-5 h-5" />
                  Watch Party
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              {/* Channel */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                    {video.channelTitle[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{video.channelTitle}</p>
                  </div>
                </div>
                <Button className="rounded-full bg-red-500 hover:bg-red-600">
                  Subscribe
                </Button>
              </div>

              {/* Description */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <div className={`text-sm text-foreground whitespace-pre-wrap ${!showDescription ? 'line-clamp-3' : ''}`}>
                  {video.description}
                </div>
                {video.description.length > 200 && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-sm text-primary mt-2 hover:underline"
                  >
                    {showDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Videos Sidebar */}
      <div className="w-full lg:w-96 lg:border-l border-border/50 lg:overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Related Videos</h3>
          <div className="space-y-3">
            {relatedVideos.map((related) => (
              <button
                key={related.id}
                onClick={() => onVideoSelect(related.id)}
                className="flex gap-3 w-full text-left group hover:bg-muted/30 p-2 rounded-lg transition-colors"
              >
                <div className="relative w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden">
                  <img
                    src={related.thumbnail}
                    alt={related.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                    {related.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{related.channelTitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Watch Party Overlay */}
      {showWatchParty && (
        <YouTubeWatchParty
          onClose={() => setShowWatchParty(false)}
          videoId={videoId}
          videoTitle={video?.title}
        />
      )}
    </div>
  );
}
