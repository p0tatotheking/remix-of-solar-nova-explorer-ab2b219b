import { useState, useRef, useEffect } from 'react';
import { Upload, Music, Trash2, Play, Pause, Loader2, Search, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useYouTubeMusic, type UserUploadedSong } from '@/contexts/YouTubeMusicContext';

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

export function UserMusicUpload() {
  const { user } = useAuth();
  const { playUserUploadedSong } = useYouTubeMusic();
  const [userMusic, setUserMusic] = useState<UserMusic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's music on mount
  useEffect(() => {
    if (!user) return;
    loadUserMusic();
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

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    // Auto-fill title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
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
      // 1. Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('user-music')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // 2. Fetch thumbnail from iTunes
      const thumbnail = await fetchThumbnailFromItunes(uploadTitle, uploadArtist);
      
      setUploadProgress(80);

      // 3. Save to database
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
      
      // Reset form and reload
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
      // Extract file path from URL for storage deletion
      const urlParts = music.file_path.split('/user-music/');
      const storagePath = urlParts[1];

      // Delete from storage
      if (storagePath) {
        await supabase.storage.from('user-music').remove([storagePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('user_uploaded_music')
        .delete()
        .eq('id', music.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserMusic(prev => prev.filter(m => m.id !== music.id));
      toast.success('Music deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete music');
    }
  };

  const handlePlay = (music: UserMusic) => {
    if (playingId === music.id) {
      setPlayingId(null);
    } else {
      setPlayingId(music.id);
      playUserUploadedSong({
        id: music.id,
        title: music.title,
        artist: music.artist,
        thumbnail: music.thumbnail_url || undefined,
        fileUrl: music.file_path,
      });
    }
  };

  const filteredMusic = userMusic.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {searchQuery ? 'No music matches your search' : 'No music uploaded yet'}
          </p>
          {!searchQuery && (
            <p className="text-sm text-muted-foreground/60 mt-1">
              Click "Upload Music" to add your first song
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredMusic.map((music) => (
            <div
              key={music.id}
              className="flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/40 rounded-xl transition-colors group"
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{music.title}</p>
                <p className="text-sm text-muted-foreground truncate">{music.artist}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePlay(music)}
                  className="h-9 w-9"
                >
                  {playingId === music.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(music)}
                  className="h-9 w-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
