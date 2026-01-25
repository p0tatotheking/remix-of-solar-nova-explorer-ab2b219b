import { useState, useMemo, useEffect } from 'react';
import { Search, Play, Mic2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const STATS_KEY = 'solarnova_user_stats';
const GAMES_HISTORY_KEY = 'solarnova_games_history';

interface Game {
  id?: string;
  title: string;
  description: string;
  url: string;
  preview: string;
  embed?: boolean;
  isTab?: string;
  category: string;
  thumbnail?: string;
}

interface FNFSectionProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
  onBack?: () => void;
}

// Default FNF games
const defaultFNFGames: Game[] = [
  {
    title: 'Friday Night Funkin',
    description: 'Test your rhythm skills in epic rap battles with challenging beats.',
    url: 'https://fnfcbn.wasmer.app/',
    preview: 'Original FNF Game',
    embed: true,
    category: 'fnf',
    thumbnail: '/thumbnails/friday-night-funkin.png',
  },
];

export function FNFSection({ onGameClick, onBack }: FNFSectionProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [games, setGames] = useState<Game[]>(defaultFNFGames);
  const [loading, setLoading] = useState(true);

  const fetchFNFGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('category', 'fnf')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedGames: Game[] = data.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          url: g.url,
          preview: g.preview,
          embed: g.embed,
          isTab: g.is_tab || undefined,
          category: g.category,
          thumbnail: g.thumbnail_url || undefined,
        }));
        setGames(mappedGames);
      }
    } catch (error) {
      console.error('Error fetching FNF games:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFNFGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      return game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             game.description.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [games, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-lg bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            {/* FNF Logo with microphone icon */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse-slow">
              <Mic2 className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" />
            </div>
            {/* Music notes decoration */}
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🎵</span>
            <span className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎶</span>
          </div>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Friday Night Funkin'
          </span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {games.length} mods available • Get funky! 🎤
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-6 md:mb-8 px-2 md:px-0">
        <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search FNF mods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-full pl-11 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading FNF mods...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <Mic2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-base md:text-lg">No FNF mods found</p>
          <p className="text-muted-foreground/70 text-xs md:text-sm mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
          {filteredGames.map((game) => (
            <button
              key={game.id || game.title}
              onClick={() => {
                // Save game to history
                if (!game.isTab && user) {
                  const historyKey = `${GAMES_HISTORY_KEY}_${user.id}`;
                  const statsKey = `${STATS_KEY}_${user.id}`;
                  
                  const existing = localStorage.getItem(historyKey);
                  let history: { thumbnail: string; title: string; id: string }[] = [];
                  if (existing) {
                    try {
                      history = JSON.parse(existing);
                    } catch {}
                  }
                  
                  const newEntry = {
                    thumbnail: game.thumbnail || '',
                    title: game.title,
                    id: game.id || game.title
                  };
                  history = [newEntry, ...history.filter(g => g.id !== newEntry.id)].slice(0, 10);
                  localStorage.setItem(historyKey, JSON.stringify(history));
                  
                  const statsData = localStorage.getItem(statsKey);
                  if (statsData) {
                    try {
                      const stats = JSON.parse(statsData);
                      stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
                      localStorage.setItem(statsKey, JSON.stringify(stats));
                    } catch {}
                  }
                }
                onGameClick(game.url, game.title, game.embed, game.isTab);
              }}
              className="group relative w-full bg-card border border-border/40 rounded-xl md:rounded-2xl overflow-hidden text-left hover:border-cyan-500/60 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]"
            >
              {/* Thumbnail Image */}
              <div className="relative w-full h-36 md:h-44 overflow-hidden">
                {game.thumbnail ? (
                  <img 
                    src={game.thumbnail} 
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-600/20 flex items-center justify-center">
                    <Mic2 className="w-12 h-12 text-cyan-400" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                    <Play className="w-6 h-6 md:w-7 md:h-7 text-white fill-white ml-0.5" />
                  </div>
                </div>
                
                {/* FNF Badge */}
                <div className="absolute top-2 md:top-3 right-2 md:right-3">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 px-2 py-1 rounded-full text-white font-bold shadow-lg">
                    FNF
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎤</span>
                  <h3 className="font-bold text-foreground text-base md:text-lg truncate group-hover:text-cyan-400 transition-colors">
                    {game.title}
                  </h3>
                </div>
                <p className="text-[11px] md:text-xs text-cyan-400/80 font-medium mb-1">{game.preview}</p>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 md:mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 text-muted-foreground text-sm">
          <span>💡</span>
          <span>Use arrow keys + space to hit the notes!</span>
        </div>
      </div>
    </div>
  );
}
