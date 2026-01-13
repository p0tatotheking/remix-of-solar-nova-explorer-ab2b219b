import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';

interface YouTubeTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
}

interface YouTubeMusicContextType {
  tracks: YouTubeTrack[];
  setTracks: (tracks: YouTubeTrack[]) => void;
  currentTrack: YouTubeTrack | null;
  isPlaying: boolean;
  playTrack: (track: YouTubeTrack) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  volume: number;
  setVolume: (vol: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isLooping: boolean;
  setIsLooping: (loop: boolean) => void;
  progress: number;
  currentTime: number;
  duration: number;
  seekTo: (percent: number) => void;
  playerReady: boolean;
}

const YouTubeMusicContext = createContext<YouTubeMusicContextType | null>(null);

export function useYouTubeMusic() {
  const context = useContext(YouTubeMusicContext);
  if (!context) {
    throw new Error('useYouTubeMusic must be used within YouTubeMusicProvider');
  }
  return context;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubeMusicProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<YouTubeTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiLoaded(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setApiLoaded(true);
    };
  }, []);

  // Create hidden player container
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.id = 'youtube-music-player-container';
      container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
      document.body.appendChild(container);
      containerRef.current = container;
    }

    return () => {
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!apiLoaded || !containerRef.current || playerRef.current) return;

    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-music-player';
    containerRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player('youtube-music-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          playerRef.current.setVolume(volume);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setDuration(playerRef.current.getDuration());
            startProgressTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopProgressTracking();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            stopProgressTracking();
            // Always play next song - loop applies to the entire playlist
            handleSongEnded();
          }
        },
      },
    });

    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiLoaded]);

  const startProgressTracking = useCallback(() => {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        setCurrentTime(current);
        setDuration(total);
        setProgress(total > 0 ? (current / total) * 100 : 0);
      }
    }, 500);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const playTrack = useCallback((track: YouTubeTrack) => {
    setCurrentTrack(track);
    if (playerRef.current && playerReady) {
      playerRef.current.loadVideoById(track.id);
    }
  }, [playerReady]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, playerReady]);

  const playNextInternal = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = tracks[(currentIndex + 1) % tracks.length];
    if (nextTrack) playTrack(nextTrack);
  }, [currentTrack, tracks, playTrack]);

  // Handle when a song ends - either loop the same song or play next
  const handleSongEnded = useCallback(() => {
    if (isLooping && playerRef.current) {
      // Loop the current song
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
    } else {
      // Auto-play next song in the playlist
      playNextInternal();
    }
  }, [isLooping, playNextInternal]);

  const playNext = useCallback(() => {
    playNextInternal();
  }, [playNextInternal]);

  const playPrevious = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = tracks[(currentIndex - 1 + tracks.length) % tracks.length];
    if (prevTrack) playTrack(prevTrack);
  }, [currentTrack, tracks, playTrack]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(vol);
    }
  }, [playerReady]);

  useEffect(() => {
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [isMuted, volume, playerReady]);

  const seekTo = useCallback((percent: number) => {
    if (playerRef.current && playerReady && duration) {
      playerRef.current.seekTo(percent * duration, true);
    }
  }, [duration, playerReady]);

  return (
    <YouTubeMusicContext.Provider
      value={{
        tracks,
        setTracks,
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
        playerReady,
      }}
    >
      {children}
    </YouTubeMusicContext.Provider>
  );
}
