import { useState, useEffect } from 'react';
import { Home, Gamepad2, MessageSquare, Bug, Music, LogOut, Shield, Megaphone, Youtube, Eye, EyeOff, Globe } from 'lucide-react';
import { DiscordChat } from '@/components/DiscordChat';
import { GamesGrid } from '@/components/GamesGrid';
import { BugsSection } from '@/components/BugsSection';
import { Announcements } from '@/components/Announcements';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicPlayerProvider, PersistentMusicPlayer } from '@/components/PersistentMusicPlayer';
import { GameEmbed } from '@/components/GameEmbed';
import { ProxyEmbed } from '@/components/ProxyEmbed';
import { YouTubePlayer, PipProvider, FloatingPipPlayer } from '@/components/YouTubePlayer';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { AdminPanel } from '@/components/AdminPanel';
import { CloakLauncher } from '@/components/CloakLauncher';
import { Snowfall } from '@/components/Snowfall';
import { SnowfallProvider, useSnowfall } from '@/contexts/SnowfallContext';
import { HomeDashboard } from '@/components/HomeDashboard';
import solarnovaIcon from '@/assets/solarnova-icon.png';

type Section = 'home' | 'games' | 'chatroom' | 'bugs' | 'music' | 'announcements' | 'youtube';

const Index = () => {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [hasChosenLaunchMethod, setHasChosenLaunchMethod] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');

  const fullText = 'SOLARNOVA V2';

  // Typewriter effect for home
  useEffect(() => {
    if (activeSection !== 'home') return;
    setTypewriterText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [activeSection]);

  // Keybinds - disabled when in chatroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (activeSection === 'chatroom') {
        return;
      }

      // Panic button - R
      if (e.key === 'r' || e.key === 'R') {
        window.location.href = 'https://www.google.com';
      }

      // Exit fullscreen - F11 or G
      if (e.key === 'F11' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'games' as const, label: 'Games', icon: Gamepad2 },
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube },
    { id: 'music' as const, label: 'Music', icon: Music },
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
    { id: 'chatroom' as const, label: 'Chatroom', icon: MessageSquare },
    { id: 'bugs' as const, label: 'Bugs', icon: Bug },
  ];

  const handleGameClick = (url: string, title: string, embed?: boolean, isTab?: string) => {
    if (isTab) {
      setActiveSection(isTab as Section);
    } else if (embed) {
      setEmbeddedGame({ url, title });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
        <div className="relative z-10 text-foreground">Loading...</div>
      </div>
    );
  }

  // Show cloak launcher FIRST (before login)
  if (!hasChosenLaunchMethod) {
    return <CloakLauncher onContinue={() => setHasChosenLaunchMethod(true)} />;
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <SnowfallProvider>
      <PipProvider>
        <MusicPlayerProvider>
          <IndexContent />
        </MusicPlayerProvider>
      </PipProvider>
    </SnowfallProvider>
  );
};

function IndexContent() {
  const { snowfallEnabled } = useSnowfall();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Snowfall effect */}
      {snowfallEnabled && <Snowfall />}
      
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
      
      <IndexInner />
    </div>
  );
}

function IndexInner() {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showProxy, setShowProxy] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [userViewMode, setUserViewMode] = useState(false);

  // Effective admin status (false when in user view mode)
  const effectiveIsAdmin = isAdmin && !userViewMode;
  const fullText = 'SOLARNOVA';

  // Typewriter effect for home
  useEffect(() => {
    if (activeSection !== 'home') return;
    setTypewriterText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [activeSection]);

  // Keybinds - disabled when in chatroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (activeSection === 'chatroom') {
        return;
      }

      // Panic button - R
      if (e.key === 'r' || e.key === 'R') {
        window.location.href = 'https://www.google.com';
      }

      // Exit fullscreen - F11 or G
      if (e.key === 'F11' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'games' as const, label: 'Games', icon: Gamepad2 },
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube },
    { id: 'music' as const, label: 'Music', icon: Music },
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone },
    { id: 'chatroom' as const, label: 'Chatroom', icon: MessageSquare },
    { id: 'bugs' as const, label: 'Bugs', icon: Bug },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'proxy') {
      setShowProxy(true);
    } else {
      setActiveSection(id as Section);
    }
    setShowNav(false);
  };

  const handleGameClick = (url: string, title: string, embed?: boolean, isTab?: string) => {
    if (isTab) {
      setActiveSection(isTab as Section);
    } else if (embed) {
      setEmbeddedGame({ url, title });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="relative z-10">
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/30 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                activeSection === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowNav(!showNav)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
              showNav ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Bug className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" menu overlay */}
      {showNav && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <img src={solarnovaIcon} alt="Solarnova" className="w-8 h-8" />
              <span className="text-lg font-bold text-gradient">SOLARNOVA V2</span>
            </div>
            <button onClick={() => setShowNav(false)} className="p-2 text-muted-foreground">
              <LogOut className="w-5 h-5 rotate-180" />
            </button>
          </div>
          
          <div className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeSection === item.id
                    ? 'bg-gradient-primary text-foreground'
                    : 'text-muted-foreground hover:bg-muted/30'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}

            {/* Proxy button */}
            <button
              onClick={() => handleNavClick('proxy')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-muted/30"
            >
              <Globe className="w-5 h-5" />
              <span>Proxy</span>
            </button>
            
            {effectiveIsAdmin && (
              <button
                onClick={() => {
                  setShowAdminPanel(true);
                  setShowNav(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary hover:bg-muted/30"
              >
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </button>
            )}
          </div>
          
          <div className="p-4 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{user.username}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-destructive text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop hover trigger zone */}
      <div 
        className="hidden md:block fixed top-0 left-0 bottom-0 w-4 z-50"
        onMouseEnter={() => setShowNav(true)}
      />

      {/* Desktop Sidebar Navigation */}
      <nav 
        className={`hidden md:block fixed top-0 left-0 bottom-0 w-64 z-50 transition-all duration-300 ${
          showNav ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
        onMouseLeave={() => setShowNav(false)}
      >
        <div className="h-full border-r border-border/30 bg-background/95 backdrop-blur-lg flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <img src={solarnovaIcon} alt="Solarnova" className="w-10 h-10" />
            <span className="text-xl font-bold text-gradient">SOLARNOVA V2</span>
          </div>

          <div className="border-t border-border/30 mx-4" />

          <div className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  activeSection === item.id
                    ? 'bg-gradient-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}

            {/* Proxy button */}
            <button
              onClick={() => handleNavClick('proxy')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-muted/30"
            >
              <Globe className="w-5 h-5" />
              <span>Proxy</span>
            </button>
          </div>

          <div className="border-t border-border/30 mx-4" />

          <div className="p-4 space-y-2">
            {effectiveIsAdmin && (
              <button
                onClick={() => {
                  setShowAdminPanel(true);
                  setShowNav(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary hover:bg-muted/30 transition-colors"
              >
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </button>
            )}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-muted-foreground truncate">{user.username}</span>
              <button
                onClick={logout}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted/30"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative pb-24 md:pb-20">
        {activeSection === 'home' && (
          <HomeDashboard 
            typewriterText={typewriterText} 
            onNavigate={(section) => setActiveSection(section as Section)}
          />
        )}

        {activeSection === 'games' && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <GamesGrid onGameClick={handleGameClick} />
          </section>
        )}

        {activeSection === 'chatroom' && (
          <DiscordChat onClose={() => setActiveSection('home')} />
        )}

        {activeSection === 'bugs' && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <BugsSection />
          </section>
        )}

        {activeSection === 'music' && (
          <section className="h-[calc(100vh-80px)]">
            <MusicPlayer />
          </section>
        )}

        {activeSection === 'announcements' && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <Announcements />
          </section>
        )}

        {activeSection === 'youtube' && (
          <section className="py-8 md:py-16 px-4 sm:px-6 lg:px-8">
            <YouTubePlayer />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-lg mt-12 md:mt-20 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm md:text-base">
              © 2024 Solarnova Gaming. Crafted by p0tato
            </p>
            <p className="text-muted-foreground/60 text-xs md:text-sm mt-2">
              Your hub for gaming excellence
            </p>
          </div>
        </div>
      </footer>

      {/* Persistent Music Player */}
      <PersistentMusicPlayer />

      {/* Floating YouTube PiP Player */}
      <FloatingPipPlayer />

      {/* Fullscreen Game Embed */}
      {embeddedGame && (
        <GameEmbed
          url={embeddedGame.url}
          title={embeddedGame.title}
          onClose={() => setEmbeddedGame(null)}
        />
      )}

      {/* Proxy Embed */}
      {showProxy && (
        <ProxyEmbed onClose={() => setShowProxy(false)} />
      )}

      {/* Admin Panel */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default Index;