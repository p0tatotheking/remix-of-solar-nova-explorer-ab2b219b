import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type GameLayoutMode = 'grid' | 'carousel';

interface GameLayoutContextType {
  layoutMode: GameLayoutMode;
  setLayoutMode: (mode: GameLayoutMode) => void;
  isLoading: boolean;
}

const GameLayoutContext = createContext<GameLayoutContextType | undefined>(undefined);

export function GameLayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [layoutMode, setLayoutModeState] = useState<GameLayoutMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load layout preference from user profile
  const loadUserLayout = useCallback(async () => {
    if (!user) {
      // Check localStorage for non-logged in users
      const stored = localStorage.getItem('solarnova_game_layout');
      if (stored === 'carousel' || stored === 'grid') {
        setLayoutModeState(stored);
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('theme_preset')
        .eq('user_id', user.id)
        .single();

      // We'll store layout preference in localStorage for now since we don't have a column for it
      const stored = localStorage.getItem(`solarnova_game_layout_${user.id}`);
      if (stored === 'carousel' || stored === 'grid') {
        setLayoutModeState(stored);
      }
    } catch (error) {
      console.error('Error loading layout settings:', error);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadUserLayout();
  }, [loadUserLayout]);

  const setLayoutMode = useCallback((mode: GameLayoutMode) => {
    setLayoutModeState(mode);
    // Save to localStorage
    if (user) {
      localStorage.setItem(`solarnova_game_layout_${user.id}`, mode);
    } else {
      localStorage.setItem('solarnova_game_layout', mode);
    }
  }, [user]);

  return (
    <GameLayoutContext.Provider
      value={{
        layoutMode,
        setLayoutMode,
        isLoading,
      }}
    >
      {children}
    </GameLayoutContext.Provider>
  );
}

export function useGameLayout() {
  const context = useContext(GameLayoutContext);
  if (!context) {
    throw new Error('useGameLayout must be used within a GameLayoutProvider');
  }
  return context;
}
