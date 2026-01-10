import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Music2, Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Repeat, Loader2, Heart, Plus, ListMusic,
  MoreHorizontal, Trash2, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useYouTubeMusic } from '@/contexts/YouTubeMusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface PlaylistSong {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail: string;
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
  const { user } = useAuth();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeView, setActiveView] = useState<'browse' | 'playlist'>('browse');
  
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

  // Fetch playlists on mount
  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('youtube_music_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const fetchPlaylistSongs = async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('youtube_playlist_songs')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('added_at', { ascending: false });

      if (!error && data) {
        setPlaylistSongs(data);
        // Set tracks for the player
        setTracks(data.map(s => ({
          id: s.video_id,
          title: s.title,
          artist: s.artist,
          thumbnail: s.thumbnail || '',
        })));
      }
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
    }
  };

  const createPlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;

    const { data, error } = await supabase
      .from('youtube_music_playlists')
      .insert({ user_id: user.id, name: newPlaylistName.trim() })
      .select()
      .single();

    if (!error && data) {
      setPlaylists(prev => [data, ...prev]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
      toast.success('Playlist created!');
    } else {
      toast.error('Failed to create playlist');
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    const { error } = await supabase
      .from('youtube_music_playlists')
      .delete()
      .eq('id', playlistId);

    if (!error) {
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setActiveView('browse');
      }
      toast.success('Playlist deleted');
    }
  };

  const addToPlaylist = async (playlistId: string, video: YouTubeVideo) => {
    const { error } = await supabase
      .from('youtube_playlist_songs')
      .insert({
        playlist_id: playlistId,
        video_id: video.id,
        title: video.title,
        artist: video.channelTitle,
        thumbnail: video.thumbnail,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Song already in playlist');
      } else {
        toast.error('Failed to add song');
      }
    } else {
      toast.success('Added to playlist!');
    }
  };

  const removeFromPlaylist = async (songId: string) => {
    const { error } = await supabase
      .from('youtube_playlist_songs')
      .delete()
      .eq('id', songId);

    if (!error) {
      setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
      toast.success('Removed from playlist');
    }
  };

  const loadVideos = useCallback(async (category: string, query?: string) => {
    setIsLoading(true);
    try {
      const categoryData = MUSIC_CATEGORIES.find(c => c.id === category);
      const searchTerm = query || categoryData?.query || 'music video';
      
      const action = category === 'trending' && !query ? 'trending' : 'search';
      const body = action === 'trending' 
        ? { action: 'trending', categoryId: '10', maxResults: 30 }
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
    if (activeView === 'browse') {
      loadVideos(activeCategory);
    }
  }, [activeCategory, activeView, loadVideos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveView('browse');
      loadVideos('search', searchQuery);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveView('browse');
    setSelectedPlaylist(null);
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

  const handlePlayPlaylistSong = (song: PlaylistSong) => {
    playTrack({
      id: song.video_id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail || '',
    });
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setActiveView('playlist');
    fetchPlaylistSongs(playlist.id);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {activeView === 'playlist' && (
              <button
                onClick={() => {
                  setActiveView('browse');
                  setSelectedPlaylist(null);
                }}
                className="p-2 hover:bg-muted/30 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {activeView === 'playlist' && selectedPlaylist 
                  ? selectedPlaylist.name 
                  : 'YouTube Music'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeView === 'playlist' 
                  ? `${playlistSongs.length} songs` 
                  : 'Discover and play music videos'}
              </p>
            </div>
          </div>
        </div>

        {activeView === 'browse' && (
          <>
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

            {/* Categories & Playlists */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => {
                  setActiveCategory('favorites');
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
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Playlists */}
        <div className="hidden md:flex w-64 flex-col border-r border-border/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Playlists
            </h3>
            {user && (
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {showCreatePlaylist && (
            <div className="mb-3 p-2 bg-muted/20 rounded-lg">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full px-2 py-1.5 bg-background border border-border/30 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createPlaylist();
                  if (e.key === 'Escape') setShowCreatePlaylist(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={createPlaylist}
                  className="flex-1 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreatePlaylist(false)}
                  className="flex-1 py-1 bg-muted/30 hover:bg-muted/50 text-muted-foreground text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {user ? 'No playlists yet' : 'Login to create playlists'}
              </p>
            ) : (
              playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlaylist?.id === playlist.id
                      ? 'bg-red-500/20 text-red-500'
                      : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => openPlaylist(playlist)}
                >
                  <ListMusic className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{playlist.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlaylist(playlist.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeView === 'playlist' && selectedPlaylist ? (
            // Playlist View
            playlistSongs.length === 0 ? (
              <div className="text-center py-12">
                <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No songs in this playlist yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse music and add songs to your playlist
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {playlistSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className={`group flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                      currentTrack?.id === song.video_id
                        ? 'bg-red-500/20'
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => handlePlayPlaylistSong(song)}
                  >
                    <div className="w-8 text-center text-sm text-muted-foreground">
                      {currentTrack?.id === song.video_id && isPlaying ? (
                        <div className="flex justify-center gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-red-500 rounded-full animate-pulse"
                              style={{
                                height: `${8 + Math.random() * 8}px`,
                                animationDelay: `${i * 0.15}s`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <img
                      src={song.thumbnail || '/placeholder.svg'}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPlaylist(song.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/20 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Browse View
            <>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`group text-left transition-all ${
                        currentTrack?.id === video.id ? 'ring-2 ring-red-500 rounded-xl' : ''
                      }`}
                    >
                      <div 
                        className="relative aspect-video rounded-xl overflow-hidden mb-2 cursor-pointer"
                        onClick={() => handlePlayVideo(video)}
                      >
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
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(video.id);
                            }}
                            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                favorites.has(video.id) ? 'fill-red-500 text-red-500' : 'text-white'
                              }`}
                            />
                          </button>
                          {user && playlists.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {playlists.map((playlist) => (
                                  <DropdownMenuItem
                                    key={playlist.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToPlaylist(playlist.id, video);
                                    }}
                                  >
                                    <ListMusic className="w-4 h-4 mr-2" />
                                    {playlist.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <h3 
                        className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-red-500 transition-colors cursor-pointer"
                        onClick={() => handlePlayVideo(video)}
                      >
                        {video.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.channelTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
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
