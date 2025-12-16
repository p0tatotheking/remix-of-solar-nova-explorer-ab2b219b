import { useState, useEffect } from 'react';
import { Home, Gamepad2, MessageSquare, Bug, Star, Music, LogOut, Shield, Megaphone } from 'lucide-react';
import { TypewriterEffect } from '@/components/TypewriterEffect';
import { GameCard } from '@/components/GameCard';
import { Chatroom } from '@/components/Chatroom';
import { GamesGrid } from '@/components/GamesGrid';
import { BugsSection } from '@/components/BugsSection';
import { Announcements } from '@/components/Announcements';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicPlayerProvider, PersistentMusicPlayer } from '@/components/PersistentMusicPlayer';
import { GameEmbed } from '@/components/GameEmbed';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/LoginPage';
import { AdminPanel } from '@/components/AdminPanel';
import { CloakLauncher } from '@/components/CloakLauncher';

type Section = 'home' | 'games' | 'chatroom' | 'bugs' | 'music' | 'announcements';

const Index = () => {
  const { user, isLoading, logout, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [embeddedGame, setEmbeddedGame] = useState<{ url: string; title: string } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [showNav, setShowNav] = useState(false);

  // Panic button - press R to close tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        window.location.href = 'https://www.google.com';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'games' as const, label: 'Games', icon: Gamepad2 },
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

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show cloak launcher after login
  if (!hasLaunched) {
    return <CloakLauncher onContinue={() => setHasLaunched(true)} />;
  }

  return (
    <MusicPlayerProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Background gradient overlay */}
        <div className="fixed inset-0 bg-gradient-bg pointer-events-none" />

        <div className="relative z-10">
          {/* Hover trigger zone at top */}
          <div 
            className="fixed top-0 left-0 right-0 h-4 z-50"
            onMouseEnter={() => setShowNav(true)}
          />

          {/* Popup Navigation */}
          <nav 
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
              showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}
            onMouseLeave={() => setShowNav(false)}
          >
            <div className="border-b border-border/30 bg-background/95 backdrop-blur-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  {/* Logo */}
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <span className="text-foreground font-bold text-xl">S</span>
                    </div>
                    <span className="text-2xl font-bold text-gradient">
                      SOLARNOVA
                    </span>
                  </div>

                  {/* Nav items */}
                  <div className="flex gap-1">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setShowNav(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                          activeSection === item.id
                            ? 'bg-gradient-primary text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* User menu */}
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowAdminPanel(true);
                          setShowNav(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-primary hover:text-secondary transition-colors"
                        title="Admin Panel"
                      >
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm">Admin</span>
                      </button>
                    )}
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {user.username}
                    </span>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="relative pb-20">
            {activeSection === 'home' && (
              <>
                {/* Hero section */}
                <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-transparent" />

                  <div className="max-w-7xl mx-auto text-center relative z-10">
                    <TypewriterEffect />

                    <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light">
                      Hub for all games and made by p0tato
                    </p>

                    <div className="inline-block p-1 bg-gradient-primary rounded-full mb-16">
                      <div className="bg-background px-6 py-3 rounded-full">
                        <p className="text-primary font-semibold">
                          ✨ Now with encrypted chatrooms
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground/60">
                      Press <kbd className="px-2 py-1 bg-muted rounded text-foreground">R</kbd> to panic exit • Hover top to show menu
                    </p>
                  </div>
                </section>

                {/* Featured games section */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                  <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <GameCard
                        title="Friday Night Funkin'"
                        description="Test your rhythm in epic rap battles with challenging beats and memorable characters"
                        url="https://fnfcbn.wasmer.app/"
                        icon={Star}
                        onClick={() => handleGameClick('https://fnfcbn.wasmer.app/', "Friday Night Funkin'", true)}
                      />
                      <GameCard
                        title="Unblocked Games"
                        description="Access an extensive library of classic and modern games, all playable instantly"
                        url="https://petezahstatic.wasmer.app"
                        icon={Gamepad2}
                      />
                      <GameCard
                        title="Solarnova Music Player"
                        description="Stream your favorite tracks with our feature-rich, beautifully designed music player"
                        onClick={() => setActiveSection('music')}
                        icon={Music}
                      />
                    </div>
                  </div>
                </section>

                {/* CTA section */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-primary/10 to-transparent">
                  <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">
                      Join the Gaming Revolution
                    </h2>
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                      Experience the future of online gaming with Solarnova. Connect with players worldwide,
                      compete in tournaments, and discover endless entertainment. Our platform brings together
                      the best games and features in one sleek, modern interface.
                    </p>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'games' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <GamesGrid onGameClick={handleGameClick} />
              </section>
            )}

            {activeSection === 'chatroom' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <Chatroom />
              </section>
            )}

            {activeSection === 'bugs' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <BugsSection />
              </section>
            )}

            {activeSection === 'music' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <MusicPlayer />
              </section>
            )}

            {activeSection === 'announcements' && (
              <section className="py-16 px-4 sm:px-6 lg:px-8">
                <Announcements />
              </section>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-border/30 bg-background/80 backdrop-blur-lg mt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <p className="text-muted-foreground">
                  © 2024 Solarnova Gaming. Crafted by p0tato
                </p>
                <p className="text-muted-foreground/60 text-sm mt-2">
                  Your hub for gaming excellence
                </p>
              </div>
            </div>
          </footer>
        </div>

        {/* Persistent Music Player */}
        <PersistentMusicPlayer />

        {/* Fullscreen Game Embed */}
        {embeddedGame && (
          <GameEmbed
            url={embeddedGame.url}
            title={embeddedGame.title}
            onClose={() => setEmbeddedGame(null)}
          />
        )}

        {/* Admin Panel */}
        {showAdminPanel && isAdmin && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )}
      </div>
    </MusicPlayerProvider>
  );
};

export default Index;
