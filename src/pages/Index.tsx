import { useState, useEffect } from 'react';
import { Home, Gamepad2, MessageSquare, Bug, Music, LogOut, Shield, Megaphone, Youtube, Eye, EyeOff, Globe, Spade, Tv, Sparkles, Settings } from 'lucide-react';
import { DiscordChat } from '@/components/DiscordChat';
import { GamesGrid } from '@/components/GamesGrid';
import { BugsSection } from '@/components/BugsSection';
import { Announcements } from '@/components/Announcements';
import { YouTubeMusicPlayer } from '@/components/music/YouTubeMusicPlayer';
import { PersistentYouTubeMiniPlayer } from '@/components/music/PersistentYouTubeMiniPlayer';
import { YouTubeMusicProvider } from '@/contexts/YouTubeMusicContext';
import { GameEmbed } from '@/components/GameEmbed';
import { PipProvider, FloatingPipPlayer } from '@/components/YouTubePlayer';
import { YouTubeApp } from '@/components/youtube/YouTubeApp';
import { UnoGame } from '@/components/UnoGame';
import { TVMoviesPlayer } from '@/components/TVMoviesPlayer';
import { StudyHelper } from '@/components/StudyHelper';
import { SettingsPage } from '@/components/SettingsPage';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { AdminPanel } from '@/components/AdminPanel';
import { CloakLauncher } from '@/components/CloakLauncher';
import { Snowfall } from '@/components/Snowfall';
import { SnowfallProvider, useSnowfall } from '@/contexts/SnowfallContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { HomeDashboard } from '@/components/HomeDashboard';
import { DisclaimerModal, useDisclaimer } from '@/components/DisclaimerModal';
import { LoadingScreen } from '@/components/LoadingScreen';
import solarnovaIcon from '@/assets/solarnova-icon.png';

type Section = 'home' | 'games' | 'chatroom' | 'bugs' | 'music' | 'announcements' | 'youtube' | 'uno' | 'tv' | 'solar' | 'settings';

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

  // Show disclaimer after login (handled in IndexInner)

  return (
    <ThemeProvider>
      <SnowfallProvider>
        <PipProvider>
          <YouTubeMusicProvider>
            <IndexContent />
          </YouTubeMusicProvider>
        </PipProvider>
      </SnowfallProvider>
    </ThemeProvider>
  );
};

function IndexContent() {
  const { snowfallEnabled } = useSnowfall();
  const { customBackground } = useTheme();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Custom Background */}
      {customBackground.type !== 'none' && (
        <div className="fixed inset-0 z-0">
          {customBackground.type === 'image' ? (
            <img 
              src={customBackground.url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <video 
              src={customBackground.url} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-background/70" />
        </div>
      )}

      {/* Snowfall effect */}
      {snowfallEnabled && <Snowfall />}
      
      {/* Background gradient overlay */}
      {customBackground.type === 'none' && (
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />
      )}
      
      <IndexInner />
    </div>
  );
}

function IndexInner() {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [userViewMode, setUserViewMode] = useState(false);
  const [showTVPlayer, setShowTVPlayer] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const { hasAccepted, handleAccept, handleDeny } = useDisclaimer();

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
    { id: 'home' as const, label: 'Home', icon: Home, disabled: false },
    { id: 'games' as const, label: 'Games', icon: Gamepad2, disabled: false },
    { id: 'tv' as const, label: 'TV & Movies', icon: Tv, disabled: false },
    { id: 'youtube' as const, label: 'YouTube', icon: Youtube, disabled: false },
    { id: 'music' as const, label: 'Music', icon: Music, disabled: false },
    { id: 'solar' as const, label: 'Solar AI', icon: Sparkles, disabled: false },
    { id: 'announcements' as const, label: 'Announce', icon: Megaphone, disabled: false },
    { id: 'chatroom' as const, label: 'Chat', icon: MessageSquare, disabled: false },
    { id: 'uno' as const, label: 'UNO', icon: Spade, disabled: false },
    { id: 'settings' as const, label: 'Settings', icon: Settings, disabled: false },
    { id: 'proxy' as const, label: 'Proxy (coming soon)', icon: Globe, disabled: true },
    { id: 'bugs' as const, label: 'Bugs', icon: Bug, disabled: false },
  ];

  const handleNavClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (id === 'proxy') {
      // Proxy is disabled, do nothing
      return;
    } else if (id === 'tv') {
      setShowTVPlayer(true);
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

  // Show loading screen after login, before disclaimer
  if (showLoading) {
    return <LoadingScreen onComplete={() => setShowLoading(false)} />;
  }

  // Show disclaimer if not accepted
  if (hasAccepted === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasAccepted) {
    return <DisclaimerModal onAccept={handleAccept} onDeny={handleDeny} />;
  }

  return (
    <div className="relative z-10">
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/30 safe-area-pb">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.disabled)}
              disabled={item.disabled}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                item.disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : activeSection === item.id || (item.id === 'tv' && showTVPlayer)
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowNav(!showNav)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
              showNav ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span className="text-[9px] font-medium">More</span>
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
                onClick={() => handleNavClick(item.id, item.disabled)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  item.disabled
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : activeSection === item.id
                      ? 'bg-gradient-primary text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}

            
            {effectiveIsAdmin && (
              <button
                onClick={() => {
                  setShowAdminPanel(true);
                  setShowNav(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary hover:bg-muted/30"
              >
                <Shield className="w-4 h-4" />
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
                onClick={() => handleNavClick(item.id, item.disabled)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  item.disabled
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : activeSection === item.id
                      ? 'bg-gradient-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}

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
                <Shield className="w-4 h-4" />
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

      {/* Fullscreen sections - rendered outside main flow */}
      {activeSection === 'chatroom' && (
        <div className="fixed inset-0 z-40 bg-background animate-fade-in">
          <DiscordChat onClose={() => setActiveSection('home')} />
        </div>
      )}

      {activeSection === 'music' && (
        <div className="fixed inset-0 z-40 bg-background animate-fade-in">
          <YouTubeMusicPlayer />
        </div>
      )}

      {activeSection === 'youtube' && (
        <div className="fixed inset-0 z-40 bg-background animate-fade-in">
          <YouTubeApp />
        </div>
      )}

      {/* Main content - only show for non-fullscreen sections */}
      {!['chatroom', 'music', 'youtube'].includes(activeSection) && (
        <main className="relative">
          <div key={activeSection} className="animate-fade-in">
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

            {activeSection === 'bugs' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <BugsSection />
              </section>
            )}

            {activeSection === 'announcements' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <Announcements />
              </section>
            )}

            {activeSection === 'uno' && (
              <section className="py-8 md:py-16 px-4 sm:px-6 lg:px-8">
                <UnoGame />
              </section>
            )}

            {activeSection === 'solar' && (
              <section className="h-[calc(100vh-80px)]">
                <StudyHelper onClose={() => setActiveSection('home')} />
              </section>
            )}

            {activeSection === 'settings' && (
              <section className="py-8 md:py-16 pb-32 md:pb-16">
                <SettingsPage />
              </section>
            )}
          </div>
        </main>
      )}

      {/* Footer - only show on pages that scroll */}
      {!['music', 'youtube', 'chatroom', 'solar'].includes(activeSection) && (
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
      )}

      {/* Persistent YouTube Music Mini Player - shows when not in music tab */}
      {activeSection !== 'music' && (
        <PersistentYouTubeMiniPlayer onExpand={() => setActiveSection('music')} />
      )}

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

      {/* TV & Movies Fullscreen Player */}
      {showTVPlayer && (
        <TVMoviesPlayer onClose={() => setShowTVPlayer(false)} />
      )}

      {/* Admin Panel */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default Index;