import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hashPassword } from '@/lib/crypto';

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
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem('solarnova_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Ensure role field exists, default to 'user' if missing
        if (!parsed.role) {
          parsed.role = 'user';
        }
        setUser(parsed);
      } catch {
        localStorage.removeItem('solarnova_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const passwordHash = await hashPassword(password);
      
      const { data, error } = await supabase.rpc('verify_login', {
        p_username: username,
        p_password_hash: passwordHash,
      });

      if (error) {
        console.error('Login error:', error);
        return { error: 'Invalid username or password' };
      }

      if (!data || data.length === 0) {
        return { error: 'Invalid username or password' };
      }

      const userData: User = {
        id: data[0].user_id,
        username: data[0].username,
        role: data[0].role || 'user',
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
