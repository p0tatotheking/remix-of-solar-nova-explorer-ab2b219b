import { useState, useRef, useEffect } from 'react';
import { Upload, Music, Trash2, Play, Pause, Loader2, Search, X, Plus, Heart, ListMusic, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useYouTubeMusic, type UserUploadedSong } from '@/contexts/YouTubeMusicContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMusic {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  file_path: string;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number | null;
  created_at: string;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
}

export function UserMusicUpload() {
  const { user } = useAuth();
  const { playUserUploadedSong, currentTrack, isPlaying } = useYouTubeMusic();
  const [userMusic, setUserMusic] = useState<UserMusic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's music and favorites on mount
  useEffect(() => {
    if (!user) return;
    loadUserMusic();
    loadFavorites();
    loadPlaylists();
  }, [user]);

  const loadUserMusic = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_uploaded_music')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserMusic((data || []) as UserMusic[]);
    } catch (error) {
      console.error('Error loading user music:', error);
      toast.error('Failed to load your music');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_music_favorites')
        .select('music_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(new Set((data || []).map(f => f.music_id)));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadPlaylists = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('youtube_music_playlists')
        .select('id, name, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const toggleFavorite = async (musicId: string) => {
    if (!user) return;

    const isFavorited = favorites.has(musicId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_music_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('music_id', musicId);

        if (error) throw error;
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(musicId);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_music_favorites')
          .insert({ user_id: user.id, music_id: musicId });

        if (error) throw error;
        setFavorites(prev => new Set(prev).add(musicId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const addToPlaylist = async (playlistId: string, music: UserMusic) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_music_playlist_songs')
        .insert({
          playlist_id: playlistId,
          music_id: music.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Song already in playlist');
        } else {
          throw error;
        }
      } else {
        toast.success('Added to playlist!');
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      toast.error('Failed to add to playlist');
    }
  };

  const fetchThumbnailFromItunes = async (title: string, artist: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('itunes-search', {
        body: { title, artist },
      });

      if (error) throw error;
      return data?.thumbnail || null;
    } catch (error) {
      console.error('Error fetching iTunes thumbnail:', error);
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio')) {
      toast.error('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setUploadTitle(fileName);
    setShowUploadForm(true);
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;

    if (!uploadTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('user-music')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      const thumbnail = await fetchThumbnailFromItunes(uploadTitle, uploadArtist);
      
      setUploadProgress(80);

      const { data: publicUrlData } = supabase.storage
        .from('user-music')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('user_uploaded_music')
        .insert({
          user_id: user.id,
          title: uploadTitle.trim(),
          artist: uploadArtist.trim() || 'Unknown Artist',
          file_path: publicUrlData.publicUrl,
          thumbnail_url: thumbnail,
          file_size: selectedFile.size,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success('Music uploaded successfully!');
      
      setSelectedFile(null);
      setUploadTitle('');
      setUploadArtist('');
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadUserMusic();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload music');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (music: UserMusic) => {
    if (!user) return;

    try {
      const urlParts = music.file_path.split('/user-music/');
      const storagePath = urlParts[1];

      if (storagePath) {
        await supabase.storage.from('user-music').remove([storagePath]);
      }

      const { error } = await supabase
        .from('user_uploaded_music')
        .delete()
        .eq('id', music.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserMusic(prev => prev.filter(m => m.id !== music.id));
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(music.id);
        return next;
      });
      toast.success('Music deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete music');
    }
  };

  const handlePlay = (music: UserMusic) => {
    playUserUploadedSong({
      id: music.id,
      title: music.title,
      artist: music.artist,
      thumbnail: music.thumbnail_url || undefined,
      fileUrl: music.file_path,
    });
  };

  const filteredMusic = userMusic
    .filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.artist.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(m => activeFilter === 'all' || favorites.has(m.id));

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Music className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Please log in to upload and manage your music</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Your Uploaded Music</h2>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
          disabled={isUploading}
        >
          <Plus className="w-4 h-4" />
          Upload Music
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && selectedFile && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Upload Details</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
            <Music className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Song Title *"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              disabled={isUploading}
            />
            <Input
              placeholder="Artist (optional - helps find cover art)"
              value={uploadArtist}
              onChange={(e) => setUploadArtist(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {uploadProgress < 60 ? 'Uploading...' : uploadProgress < 80 ? 'Fetching cover art...' : 'Saving...'}
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={isUploading || !uploadTitle.trim()}
            className="w-full gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          All ({userMusic.length})
        </button>
        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
            activeFilter === 'favorites'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${activeFilter === 'favorites' ? 'fill-current' : ''}`} />
          Favorites ({favorites.size})
        </button>
      </div>

      {/* Search */}
      {userMusic.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Music List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredMusic.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'No music matches your search' 
              : activeFilter === 'favorites'
                ? 'No favorites yet'
                : 'No music uploaded yet'}
          </p>
          {!searchQuery && activeFilter === 'all' && (
            <p className="text-sm text-muted-foreground/60 mt-1">
              Click "Upload Music" to add your first song
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredMusic.map((music) => {
            const isCurrentTrack = currentTrack?.id === music.id;
            
            return (
              <div
                key={music.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                  isCurrentTrack ? 'bg-primary/20' : 'bg-muted/20 hover:bg-muted/40'
                }`}
              >
                {/* Thumbnail */}
                <div 
                  className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
                  onClick={() => handlePlay(music)}
                >
                  {music.thumbnail_url ? (
                    <img
                      src={music.thumbnail_url}
                      alt={music.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCurrentTrack && isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlay(music)}>
                  <p className="font-medium text-foreground truncate">{music.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{music.artist}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Favorite button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite(music.id)}
                    className="h-9 w-9"
                  >
                    <Heart 
                      className={`w-4 h-4 ${favorites.has(music.id) ? 'fill-red-500 text-red-500' : ''}`} 
                    />
                  </Button>

                  {/* More options dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {playlists.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ListMusic className="w-4 h-4 mr-2" />
                            Add to playlist
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {playlists.map((playlist) => (
                              <DropdownMenuItem
                                key={playlist.id}
                                onClick={() => addToPlaylist(playlist.id, music)}
                              >
                                {playlist.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(music)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
