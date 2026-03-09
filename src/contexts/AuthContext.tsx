import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('solarnova_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Re-verify role from server on load
        verifyUserRole(parsed).then(verified => {
          if (verified) {
            setUser(verified);
            localStorage.setItem('solarnova_user', JSON.stringify(verified));
          } else {
            localStorage.removeItem('solarnova_user');
          }
          setIsLoading(false);
        });
        return;
      } catch {
        localStorage.removeItem('solarnova_user');
      }
    }
    setIsLoading(false);
  }, []);

  const verifyUserRole = async (parsed: { id: string; username: string }): Promise<User | null> => {
    try {
      const { data } = await supabase.rpc('has_role', { _user_id: parsed.id, _role: 'admin' });
      return {
        id: parsed.id,
        username: parsed.username,
        role: data ? 'admin' : 'user',
      };
    } catch {
      return null;
    }
  };

  const login = async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-hash', {
        body: { action: 'login', username, password },
      });

      if (error || data?.error) {
        return { error: data?.error || 'Invalid username or password' };
      }

      const userData: User = {
        id: data.user_id,
        username: data.username,
        role: data.role || 'user',
      };

      setUser(userData);
      localStorage.setItem('solarnova_user', JSON.stringify(userData));
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'An error occurred during login' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('solarnova_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
