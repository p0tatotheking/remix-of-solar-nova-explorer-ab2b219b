import { useState, useEffect } from 'react';
import { 
  Search,
  Music,
  Loader2,
  Trash2,
  Upload as UploadIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from './PersistentMusicPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { MusicUpload } from './MusicUpload';
import { toast } from 'sonner';

interface Track {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  image: string;
  audio: string;
  duration: number;
  isUploaded?: boolean;
}

interface UploadedMusic {
  id: string;
  title: string;
  artist: string;
  file_path: string;
  created_at: string;
}

export function MusicPlayer() {
  const { user, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'jamendo'>('uploaded');
  const [uploadedTracks, setUploadedTracks] = useState<Track[]>([]);
  const { tracks, setTracks, currentTrack, playTrack } = useMusicPlayer();

  // Fetch uploaded music
  const fetchUploadedMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('uploaded_music')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploaded music:', error);
        return;
      }

      const formattedTracks: Track[] = (data as UploadedMusic[]).map((item) => {
        const { data: urlData } = supabase.storage.from('music').getPublicUrl(item.file_path);
        return {
          id: item.id,
          name: item.title,
          artist_name: item.artist,
          album_name: 'Uploaded',
          image: '',
          audio: urlData.publicUrl,
          duration: 0,
          isUploaded: true,
        };
      });

      setUploadedTracks(formattedTracks);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch popular tracks on mount
  useEffect(() => {
    fetchUploadedMusic();
    if (tracks.length === 0) {
      fetchPopularTracks();
    }
  }, []);

  const fetchPopularTracks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-api', {
        body: null,
      });

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }

      if (data?.results) {
        setTracks(data.results);
      }
    } catch (error) {
      console.error('Error fetching popular tracks:', error);
    }
    setIsLoading(false);
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      fetchPopularTracks();
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-api', {
        body: { action: 'search', query },
      });

      if (error) {
        console.error('Error searching tracks:', error);
        return;
      }

      if (data?.results) {
        setTracks(data.results);
      }
    } catch (error) {
      console.error('Error searching tracks:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'jamendo') {
      const debounce = setTimeout(() => {
        searchTracks(searchQuery);
      }, 500);

      return () => clearTimeout(debounce);
    }
  }, [searchQuery, activeTab]);

  const handleDeleteTrack = async (trackId: string, filePath: string) => {
    if (!user || !isAdmin) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase.rpc('delete_uploaded_music', {
        p_admin_id: user.id,
        p_music_id: trackId,
      });

      if (dbError) {
        console.error('Error deleting track:', dbError);
        toast.error('Failed to delete track');
        return;
      }

      // Delete from storage - extract filename from audio URL
      const fileName = uploadedTracks.find(t => t.id === trackId)?.audio.split('/').pop();
      if (fileName) {
        await supabase.storage.from('music').remove([fileName]);
      }

      toast.success('Track deleted');
      fetchUploadedMusic();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete track');
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTracks = activeTab === 'uploaded' ? uploadedTracks : tracks;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gradient mb-2">Music Player</h2>
        <p className="text-muted-foreground">Stream music from uploaded tracks or Jamendo</p>
      </div>

      {/* Admin Upload Section */}
      {isAdmin && <MusicUpload onUploadComplete={fetchUploadedMusic} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('uploaded')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'uploaded'
              ? 'bg-gradient-primary text-foreground'
              : 'bg-muted/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          <UploadIcon className="w-4 h-4" />
          Uploaded Music
        </button>
        <button
          onClick={() => setActiveTab('jamendo')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'jamendo'
              ? 'bg-gradient-primary text-foreground'
              : 'bg-muted/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Music className="w-4 h-4" />
          Jamendo Library
        </button>
      </div>

      {/* Search Bar (only for Jamendo) */}
      {activeTab === 'jamendo' && (
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for songs, artists, or albums..."
            className="w-full bg-background/50 border border-border/30 rounded-xl pl-12 pr-4 py-4 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      )}

      {/* Track List */}
      <div className="bg-gradient-card border border-border/30 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h3 className="text-lg font-semibold text-foreground">
            {activeTab === 'uploaded' ? 'Uploaded Tracks' : searchQuery ? 'Search Results' : 'Popular Tracks'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'uploaded' 
              ? 'Music uploaded by admins' 
              : 'Free Creative Commons music • Full-length tracks'}
          </p>
        </div>

        <div className="h-[500px] overflow-y-auto">
          {isLoading && activeTab === 'jamendo' ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Music className="w-16 h-16 mb-4 opacity-50" />
              <p>{activeTab === 'uploaded' ? 'No uploaded music yet' : 'No tracks found'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {displayTracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors ${
                    currentTrack?.id === track.id ? 'bg-primary/20' : ''
                  }`}
                >
                  <button
                    onClick={() => playTrack(track)}
                    className="flex-1 flex items-center gap-4 text-left"
                  >
                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.album_name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{track.name}</p>
                      <p className="text-muted-foreground text-sm truncate">{track.artist_name}</p>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      {formatTime(track.duration)}
                    </span>
                  </button>
                  {isAdmin && track.isUploaded && (
                    <button
                      onClick={() => {
                        const uploadedTrack = uploadedTracks.find(t => t.id === track.id);
                        if (uploadedTrack) {
                          handleDeleteTrack(track.id, uploadedTrack.audio);
                        }
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
