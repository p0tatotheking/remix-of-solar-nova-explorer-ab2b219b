import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

  // Load preferences
  useEffect(() => {
    const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.popupsDisabled) setPopupsDisabledState(true);
        if (prefs.transitionsDisabled) setTransitionsDisabledState(true);
      }
    } catch {}
  }, [user]);

  // Apply/remove transitions class on body
  useEffect(() => {
    if (transitionsDisabled) {
      document.documentElement.classList.add('no-transitions');
    } else {
      document.documentElement.classList.remove('no-transitions');
    }
  }, [transitionsDisabled]);

  const save = useCallback((popups: boolean, transitions: boolean) => {
    const key = user ? `solarnova_prefs_${user.id}` : 'solarnova_prefs';
    localStorage.setItem(key, JSON.stringify({ popupsDisabled: popups, transitionsDisabled: transitions }));
  }, [user]);

  const setPopupsDisabled = useCallback((disabled: boolean) => {
    setPopupsDisabledState(disabled);
    save(disabled, transitionsDisabled);
  }, [save, transitionsDisabled]);

  const setTransitionsDisabled = useCallback((disabled: boolean) => {
    setTransitionsDisabledState(disabled);
    save(popupsDisabled, disabled);
  }, [save, popupsDisabled]);

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
