import { useState, useEffect } from 'react';
import { 
  Search,
  Music,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from './PersistentMusicPlayer';

interface Track {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  image: string;
  audio: string;
  duration: number;
}

export function MusicPlayer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { tracks, setTracks, currentTrack, playTrack } = useMusicPlayer();

  // Fetch popular tracks on mount
  useEffect(() => {
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
    const debounce = setTimeout(() => {
      searchTracks(searchQuery);
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gradient mb-2">Music Player</h2>
        <p className="text-muted-foreground">Stream free full-length tracks from Jamendo</p>
      </div>

      {/* Search Bar */}
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

      {/* Track List */}
      <div className="bg-gradient-card border border-border/30 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h3 className="text-lg font-semibold text-foreground">
            {searchQuery ? 'Search Results' : 'Popular Tracks'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Free Creative Commons music • Full-length tracks
          </p>
        </div>

        <div className="h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Music className="w-16 h-16 mb-4 opacity-50" />
              <p>No tracks found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left ${
                    currentTrack?.id === track.id ? 'bg-primary/20' : ''
                  }`}
                >
                  <img
                    src={track.image || '/placeholder.svg'}
                    alt={track.album_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium truncate">{track.name}</p>
                    <p className="text-muted-foreground text-sm truncate">{track.artist_name}</p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {formatTime(track.duration)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
