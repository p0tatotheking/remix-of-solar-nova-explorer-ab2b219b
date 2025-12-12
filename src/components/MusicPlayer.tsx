import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Volume2, 
  VolumeX,
  Search,
  Music,
  Loader2
} from 'lucide-react';

interface Track {
  id: number;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium: string;
  };
  preview: string;
  duration: number;
}

export function MusicPlayer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch popular tracks on mount
  useEffect(() => {
    fetchPopularTracks();
  }, []);

  const fetchPopularTracks = async () => {
    setIsLoading(true);
    try {
      // Using Deezer's chart endpoint through a CORS proxy
      const response = await fetch(
        'https://corsproxy.io/?https://api.deezer.com/chart/0/tracks?limit=50'
      );
      const data = await response.json();
      if (data.data) {
        setPopularTracks(data.data);
        setTracks(data.data);
      }
    } catch (error) {
      console.error('Error fetching popular tracks:', error);
    }
    setIsLoading(false);
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setTracks(popularTracks);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://corsproxy.io/?https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=50`
      );
      const data = await response.json();
      if (data.data) {
        setTracks(data.data);
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = track.preview;
      audioRef.current.play();
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  const playNext = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = tracks[(currentIndex + 1) % tracks.length];
    if (nextTrack) playTrack(nextTrack);
  };

  const playPrevious = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = tracks[(currentIndex - 1 + tracks.length) % tracks.length];
    if (prevTrack) playTrack(prevTrack);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => !isLooping && playNext()}
      />

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-gradient mb-2">Music Player</h2>
        <p className="text-muted-foreground">Stream thousands of songs from Deezer</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Track List */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-card border border-border/30 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">
                {searchQuery ? 'Search Results' : 'Popular Tracks'}
              </h3>
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
                        src={track.album.cover_medium}
                        alt={track.album.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium truncate">{track.title}</p>
                        <p className="text-muted-foreground text-sm truncate">{track.artist.name}</p>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {formatDuration(track.duration)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Now Playing */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-card border border-border/30 rounded-xl p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-foreground mb-6">Now Playing</h3>

            {currentTrack ? (
              <>
                <img
                  src={currentTrack.album.cover_medium}
                  alt={currentTrack.album.title}
                  className="w-full aspect-square rounded-xl object-cover mb-6 shadow-glow"
                />

                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-foreground truncate">{currentTrack.title}</h4>
                  <p className="text-muted-foreground truncate">{currentTrack.artist.name}</p>
                </div>

                {/* Progress Bar */}
                <div
                  className="h-2 bg-muted rounded-full mb-6 cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={playPrevious}
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SkipBack className="w-6 h-6" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="p-4 bg-gradient-primary rounded-full shadow-glow hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-foreground" />
                    ) : (
                      <Play className="w-8 h-8 text-foreground ml-1" />
                    )}
                  </button>

                  <button
                    onClick={playNext}
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>

                {/* Loop & Volume */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-lg transition-colors ${
                      isLooping ? 'bg-primary/30 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Repeat className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-24 accent-primary"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Music className="w-16 h-16 mb-4 opacity-50" />
                <p>Select a track to play</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
