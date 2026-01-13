import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';

export type RepeatMode = 'off' | 'one' | 'all';

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
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  isShuffled: boolean;
  setIsShuffled: (shuffled: boolean) => void;
  progress: number;
  currentTime: number;
  duration: number;
  seekTo: (percent: number) => void;
  playerReady: boolean;
  // Legacy support
  isLooping: boolean;
  setIsLooping: (loop: boolean) => void;
}

const YouTubeMusicContext = createContext<YouTubeMusicContextType | null>(null);

const STORAGE_KEY_REPEAT = 'solarnova_yt_repeat_mode';
const STORAGE_KEY_SHUFFLE = 'solarnova_yt_shuffle';

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

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function YouTubeMusicProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracksState] = useState<YouTubeTrack[]>([]);
  const [shuffledTracks, setShuffledTracks] = useState<YouTubeTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<YouTubeTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPEAT);
    return (saved as RepeatMode) || 'off';
  });
  const [isShuffled, setIsShuffledState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true';
  });
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Persist settings
  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
    localStorage.setItem(STORAGE_KEY_REPEAT, mode);
  }, []);

  const setIsShuffled = useCallback((shuffled: boolean) => {
    setIsShuffledState(shuffled);
    localStorage.setItem(STORAGE_KEY_SHUFFLE, String(shuffled));
    if (shuffled && tracks.length > 0) {
      setShuffledTracks(shuffleArray(tracks));
    }
  }, [tracks]);

  // Set tracks and update shuffle order
  const setTracks = useCallback((newTracks: YouTubeTrack[]) => {
    setTracksState(newTracks);
    if (isShuffled) {
      setShuffledTracks(shuffleArray(newTracks));
    }
  }, [isShuffled]);

  // Get the active track list (shuffled or normal)
  const getActiveTrackList = useCallback(() => {
    if (isShuffled && shuffledTracks.length > 0) {
      return shuffledTracks;
    }
    return tracks;
  }, [isShuffled, shuffledTracks, tracks]);

  // Legacy isLooping support (maps to repeatMode === 'one')
  const isLooping = repeatMode === 'one';
  const setIsLooping = useCallback((loop: boolean) => {
    setRepeatMode(loop ? 'one' : 'off');
  }, [setRepeatMode]);

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

  const playNextInternal = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;
    
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % activeList.length;
    
    // If we've looped back to start and repeat is off, stop
    if (nextIndex === 0 && repeatMode === 'off' && currentIndex === activeList.length - 1) {
      // End of playlist, don't auto-play
      return;
    }
    
    const nextTrack = activeList[nextIndex];
    if (nextTrack) playTrack(nextTrack);
  }, [currentTrack, getActiveTrackList, playTrack, repeatMode]);

  // Replay current track
  const replayCurrentTrack = useCallback(() => {
    if (!playerRef.current || !playerReady || !currentTrack) return;
    
    try {
      playerRef.current.loadVideoById(currentTrack.id, 0);
      setTimeout(() => {
        try {
          playerRef.current?.playVideo?.();
        } catch {
          // ignore
        }
      }, 50);
    } catch {
      try {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      } catch {
        // ignore
      }
    }
  }, [currentTrack, playerReady]);

  // Handle when a song ends
  const handleSongEnded = useCallback(() => {
    if (!playerRef.current || !playerReady || !currentTrack) return;

    const activeList = getActiveTrackList();

    // Repeat One: Always replay the current track
    if (repeatMode === 'one') {
      replayCurrentTrack();
      return;
    }

    // No playlist / single song: Auto-replay the song
    if (activeList.length === 0 || (activeList.length === 1 && activeList[0].id === currentTrack.id)) {
      replayCurrentTrack();
      return;
    }

    // Check if we're at the end of the playlist
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const isLastTrack = currentIndex === activeList.length - 1;

    if (isLastTrack) {
      if (repeatMode === 'all') {
        // Loop back to first track
        playTrack(activeList[0]);
      }
      // If repeatMode is 'off', just stop (don't auto-play)
      return;
    }

    // Continue to next track
    playNextInternal();
  }, [currentTrack, getActiveTrackList, playNextInternal, playTrack, playerReady, repeatMode, replayCurrentTrack]);

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
          // Safely set volume after player is ready
          if (playerRef.current?.setVolume) {
            playerRef.current.setVolume(volume);
          }
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
  }, [apiLoaded, handleSongEnded, startProgressTracking, stopProgressTracking, volume]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, playerReady]);

  const playNext = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;
    
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = activeList[(currentIndex + 1) % activeList.length];
    if (nextTrack) playTrack(nextTrack);
  }, [currentTrack, getActiveTrackList, playTrack]);

  const playPrevious = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;
    
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = activeList[(currentIndex - 1 + activeList.length) % activeList.length];
    if (prevTrack) playTrack(prevTrack);
  }, [currentTrack, getActiveTrackList, playTrack]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (playerRef.current?.setVolume && playerReady) {
      playerRef.current.setVolume(vol);
    }
  }, [playerReady]);

  useEffect(() => {
    if (playerRef.current?.setVolume && playerReady) {
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
        repeatMode,
        setRepeatMode,
        isShuffled,
        setIsShuffled,
        progress,
        currentTime,
        duration,
        seekTo,
        playerReady,
        // Legacy
        isLooping,
        setIsLooping,
      }}
    >
      {children}
    </YouTubeMusicContext.Provider>
  );
}
