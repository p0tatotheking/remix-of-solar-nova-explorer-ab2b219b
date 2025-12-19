import { useState, useMemo } from 'react';
import { Search, Play, Gamepad2, Music, Cpu, Car, Sparkles } from 'lucide-react';

interface Game {
  title: string;
  description: string;
  url: string;
  preview: string;
  embed?: boolean;
  isTab?: string;
  category: string;
}

interface GamesGridProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
}

const categories = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'rhythm', label: 'Rhythm', icon: Music },
  { id: 'arcade', label: 'Arcade', icon: Sparkles },
  { id: 'utility', label: 'Utility', icon: Cpu },
  { id: 'racing', label: 'Racing', icon: Car },
];

const getGameEmoji = (title: string, category: string) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('music') || titleLower.includes('funkin')) return '🎵';
  if (titleLower.includes('car') || titleLower.includes('race')) return '🏎️';
  if (titleLower.includes('cobra')) return '🐍';
  if (titleLower.includes('lumi') || titleLower.includes('os')) return '💻';
  if (titleLower.includes('petezah')) return '🎮';
  if (titleLower.includes('umbrion')) return '⚡';
  if (titleLower.includes('kermit')) return '🐸';
  return '🎯';
};

export function GamesGrid({ onGameClick }: GamesGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const games: Game[] = [
    {
      title: 'Friday Night Funkin',
      description: 'Test your rhythm skills in epic rap battles with challenging beats.',
      url: 'https://fnfcbn.wasmer.app/',
      preview: 'Rhythm battle game',
      embed: true,
      category: 'rhythm',
    },
    {
      title: 'Petezah Games',
      description: 'Access a massive collection of unblocked games all in one place.',
      url: 'https://petezahstatic.wasmer.app',
      preview: 'Game collection hub',
      embed: true,
      category: 'arcade',
    },
    {
      title: 'Solarnova Music',
      description: 'Stream your favorite music with our sleek, feature-rich player.',
      url: '',
      preview: 'Music streaming',
      isTab: 'music',
      category: 'utility',
    },
    {
      title: 'Umbrion Games',
      description: 'Explore creative indie game projects and unique experiences.',
      url: 'https://umbrion.wasmer.app/projects.html',
      preview: 'Indie game showcase',
      embed: true,
      category: 'arcade',
    },
    {
      title: 'Lumi OS',
      description: 'A complete web-based operating system in your browser.',
      url: 'https://lumios.wasmer.app',
      preview: 'Browser OS',
      embed: true,
      category: 'utility',
    },
    {
      title: 'Kermitco',
      description: 'Unique gaming experience with creative challenges and fun.',
      url: 'https://kermitcooffline82hfdisocirk88enlqtpc75wchgb45cstvvixmc-12367506.codehs.me/0aDV71GtSpyy91KtZE6P7qeL56mVU5nSvCKNk5fdoGV6N1xy1qsbFa548gBQcARY.html',
      preview: 'Creative adventure',
      embed: true,
      category: 'arcade',
    },
    {
      title: 'Cobra',
      description: 'Professional business platform with powerful productivity tools.',
      url: 'https://thecobra.odoo.com/',
      preview: 'Business platform',
      embed: true,
      category: 'utility',
    },
    {
      title: 'Car Game',
      description: 'Get behind the wheel and race through exciting tracks.',
      url: 'https://codebeautify.org/htmlviewer/y25205daf#',
      preview: 'Racing game',
      embed: true,
      category: 'racing',
    },
  ];

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-3 text-gradient">
          Game Library
        </h2>
        <p className="text-muted-foreground">
          {games.length} games available
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-full pl-12 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-16">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-lg">No games found</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const emoji = getGameEmoji(game.title, game.category);
            return (
              <button
                key={game.title}
                onClick={() => onGameClick(game.url, game.title, game.embed, game.isTab)}
                className="group relative bg-card border border-border/40 rounded-2xl p-5 text-left hover:border-primary/60 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start gap-4">
                  {/* Emoji Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">{emoji}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {game.title}
                      </h3>
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-primary/80 font-medium mb-2">{game.preview}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  </div>
                </div>

                {/* Category badge */}
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                    {game.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}