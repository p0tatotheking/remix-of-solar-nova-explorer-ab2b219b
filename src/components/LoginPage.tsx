import { useState, useEffect } from 'react';
import { Lock, User, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { hashPassword } from '@/lib/crypto';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [cloaked, setCloaked] = useState(false);
  const { login } = useAuth();

  // About:blank cloaking - opens site in a new blank tab
  useEffect(() => {
    const handleCloak = () => {
      if (cloaked) return;
      
      const newWindow = window.open('about:blank', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>about:blank</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${window.location.href}"></iframe>
          </body>
          </html>
        `);
        newWindow.document.close();
        setCloaked(true);
      }
    };

    if (!cloaked) {
      document.addEventListener('click', handleCloak, { once: true });
    }

    return () => {
      document.removeEventListener('click', handleCloak);
    };
  }, [cloaked]);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_exists');
      if (error) throw error;
      setNeedsSetup(!data);
    } catch (err) {
      console.error('Error checking admin:', err);
      setNeedsSetup(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      
      const { error } = await supabase.rpc('seed_admin_user', {
        p_username: username.trim(),
        p_password_hash: passwordHash,
      });

      if (error) throw error;

      setSetupComplete(true);
      setNeedsSetup(false);
      
      // Auto login
      const result = await login(username.trim(), password);
      if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  // Show loading while checking if setup needed
  if (needsSetup === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
        <div className="relative z-10 text-foreground">Loading...</div>
      </div>
    );
  }

  // First time setup - create admin
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-gradient-card border border-border/30 rounded-xl p-8 shadow-glow">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-foreground w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold text-gradient">Initial Setup</h1>
              <p className="text-muted-foreground mt-2">Create the admin account</p>
            </div>

            <form onSubmit={handleSetup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter admin username"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background/50 border border-border/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter admin password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/20">
              <p className="text-muted-foreground text-sm text-center">
                This is a one-time setup. The admin can create other users.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-card border border-border/30 rounded-xl p-8 shadow-glow">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
              <span className="text-foreground font-bold text-3xl">S</span>
            </div>
            <h1 className="text-3xl font-bold text-gradient">SOLARNOVA</h1>
            <p className="text-muted-foreground mt-2">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background/50 border border-border/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background/50 border border-border/30 rounded-lg pl-10 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/20">
            <p className="text-muted-foreground text-sm text-center">
              Contact the admin to get an account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
