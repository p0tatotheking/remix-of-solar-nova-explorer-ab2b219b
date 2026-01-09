import { useState } from 'react';
import { YouTubeHome } from './YouTubeHome';
import { YouTubeShorts } from './YouTubeShorts';
import { YouTubeWatch } from './YouTubeWatch';
import { Home, Flame, Film, Library, Youtube } from 'lucide-react';

type View = 'home' | 'shorts' | 'watch';

interface YouTubeAppProps {
  onClose?: () => void;
}

export function YouTubeApp({ onClose }: YouTubeAppProps) {
  const [view, setView] = useState<View>('home');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleVideoSelect = (videoId: string) => {
    setCurrentVideoId(videoId);
    setView('watch');
  };

  const handleBack = () => {
    if (view === 'shorts') {
      setView('home');
    } else {
      setView('home');
      setCurrentVideoId(null);
    }
  };

  const handleShortsClick = () => {
    setView('shorts');
  };
  
  const isShorts = view === 'shorts';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">YouTube</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {view !== 'shorts' && (
          <nav className="hidden md:flex w-20 flex-col items-center py-4 gap-2 border-r border-border/50">
            <button
              onClick={() => { setView('home'); setCurrentVideoId(null); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 ${
                view === 'home' && !currentVideoId ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </button>
            <button
              onClick={handleShortsClick}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 ${
                isShorts ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Flame className="w-5 h-5" />
              <span className="text-[10px]">Shorts</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 text-muted-foreground hover:bg-muted/50"
            >
              <Film className="w-5 h-5" />
              <span className="text-[10px]">Subs</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-colors w-16 text-muted-foreground hover:bg-muted/50"
            >
              <Library className="w-5 h-5" />
              <span className="text-[10px]">Library</span>
            </button>
          </nav>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {view === 'home' && !currentVideoId && (
            <YouTubeHome
              onVideoSelect={handleVideoSelect}
              onShortsClick={handleShortsClick}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
          {view === 'shorts' && (
            <YouTubeShorts onBack={handleBack} />
          )}
          {view === 'watch' && currentVideoId && (
            <YouTubeWatch
              videoId={currentVideoId}
              onBack={handleBack}
              onVideoSelect={handleVideoSelect}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {view !== 'shorts' && (
        <nav className="md:hidden flex items-center justify-around py-2 border-t border-border/50 bg-background">
          <button
            onClick={() => { setView('home'); setCurrentVideoId(null); }}
            className={`flex flex-col items-center gap-1 p-2 ${
              view === 'home' && !currentVideoId ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={handleShortsClick}
            className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px]">Shorts</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Film className="w-5 h-5" />
            <span className="text-[10px]">Subs</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Library className="w-5 h-5" />
            <span className="text-[10px]">Library</span>
          </button>
        </nav>
      )}
    </div>
  );
}
