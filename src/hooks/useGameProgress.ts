import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GameSession {
  gameId: string;
  gameTitle: string;
  gameUrl: string;
  lastPlayed: string;
  playTime: number; // in seconds
}

const STORAGE_KEY = 'game_progress';

export function useGameProgress() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    const key = `${STORAGE_KEY}_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading game progress:', e);
      }
    }
  }, [user]);

  // Save session when starting a game
  const startGameSession = useCallback((gameId: string, gameTitle: string, gameUrl: string) => {
    if (!user) return;
    
    const key = `${STORAGE_KEY}_${user.id}`;
    const newSession: GameSession = {
      gameId,
      gameTitle,
      gameUrl,
      lastPlayed: new Date().toISOString(),
      playTime: 0,
    };

    setSessions(prev => {
      // Check if game already exists
      const existingIndex = prev.findIndex(s => s.gameId === gameId);
      let updated: GameSession[];
      
      if (existingIndex >= 0) {
        // Update existing session
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastPlayed: new Date().toISOString(),
        };
      } else {
        // Add new session
        updated = [newSession, ...prev];
      }
      
      // Keep last 50 sessions
      updated = updated.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });

    return newSession;
  }, [user]);

  // Update play time for current session
  const updatePlayTime = useCallback((gameId: string, additionalSeconds: number) => {
    if (!user) return;
    
    const key = `${STORAGE_KEY}_${user.id}`;
    setSessions(prev => {
      const updated = prev.map(s => 
        s.gameId === gameId 
          ? { ...s, playTime: s.playTime + additionalSeconds, lastPlayed: new Date().toISOString() }
          : s
      );
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  // Get recently played games
  const getRecentlyPlayed = useCallback((limit = 10) => {
    return sessions
      .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime())
      .slice(0, limit);
  }, [sessions]);

  // Get specific game session
  const getGameSession = useCallback((gameId: string) => {
    return sessions.find(s => s.gameId === gameId);
  }, [sessions]);

  // Clear all game progress
  const clearProgress = useCallback(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}_${user.id}`;
    localStorage.removeItem(key);
    setSessions([]);
  }, [user]);

  // Format play time
  const formatPlayTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }, []);

  return {
    sessions,
    startGameSession,
    updatePlayTime,
    getRecentlyPlayed,
    getGameSession,
    clearProgress,
    formatPlayTime,
  };
}
