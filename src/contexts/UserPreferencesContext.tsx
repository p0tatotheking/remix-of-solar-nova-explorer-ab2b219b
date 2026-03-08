import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferencesContextType {
  popupsDisabled: boolean;
  setPopupsDisabled: (disabled: boolean) => void;
  transitionsDisabled: boolean;
  setTransitionsDisabled: (disabled: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [popupsDisabled, setPopupsDisabledState] = useState(false);
  const [transitionsDisabled, setTransitionsDisabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load preferences from DB if logged in, else localStorage
  useEffect(() => {
    const load = async () => {
      if (user) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('popups_disabled, transitions_disabled')
            .eq('user_id', user.id)
            .single();

          if (data) {
            setPopupsDisabledState(data.popups_disabled ?? false);
            setTransitionsDisabledState(data.transitions_disabled ?? false);
            setLoaded(true);
            return;
          }
        } catch {}
      }

      // Fallback to localStorage
      const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.popupsDisabled) setPopupsDisabledState(true);
          if (prefs.transitionsDisabled) setTransitionsDisabledState(true);
        }
      } catch {}
      setLoaded(true);
    };
    
    setLoaded(false);
    load();
  }, [user]);

  // Apply/remove transitions class on body
  useEffect(() => {
    if (transitionsDisabled) {
      document.documentElement.classList.add('no-transitions');
    } else {
      document.documentElement.classList.remove('no-transitions');
    }
  }, [transitionsDisabled]);

  const saveToDb = useCallback(async (popups: boolean, transitions: boolean) => {
    if (user) {
      await supabase.rpc('update_my_profile', {
        p_caller_id: user.id,
        p_popups_disabled: popups,
        p_transitions_disabled: transitions,
      });
    }
    // Also save to localStorage as fallback
    const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
    localStorage.setItem(key, JSON.stringify({ popupsDisabled: popups, transitionsDisabled: transitions }));
  }, [user]);

  const setPopupsDisabled = useCallback((disabled: boolean) => {
    setPopupsDisabledState(disabled);
    saveToDb(disabled, transitionsDisabled);
  }, [saveToDb, transitionsDisabled]);

  const setTransitionsDisabled = useCallback((disabled: boolean) => {
    setTransitionsDisabledState(disabled);
    saveToDb(popupsDisabled, disabled);
  }, [saveToDb, popupsDisabled]);

  return (
    <UserPreferencesContext.Provider value={{ popupsDisabled, setPopupsDisabled, transitionsDisabled, setTransitionsDisabled }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
