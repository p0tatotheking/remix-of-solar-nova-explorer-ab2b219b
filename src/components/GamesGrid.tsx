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
  thumbnail?: string;
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
      thumbnail: 'https://images.launchbox-app.com/382e2596-44e8-41fa-93d6-b1f267bc5223.png',
    },
    {
      title: 'Petezah Games',
      description: 'Access a massive collection of unblocked games all in one place.',
      url: 'https://petezahstatic.wasmer.app',
      preview: 'Game collection hub',
      embed: true,
      category: 'arcade',
      thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541f7f2f07?w=400&h=300&fit=crop',
    },
    {
      title: 'Solarnova Music',
      description: 'Stream your favorite music with our sleek, feature-rich player.',
      url: '',
      preview: 'Music streaming',
      isTab: 'music',
      category: 'utility',
      thumbnail: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=300&fit=crop',
    },
    {
      title: 'Umbrion Games',
      description: 'Explore creative indie game projects and unique experiences.',
      url: 'https://umbrion.wasmer.app/projects.html',
      preview: 'Indie game showcase',
      embed: true,
      category: 'arcade',
      thumbnail: 'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/3553640/header.jpg',
    },
    {
      title: 'Lumi OS',
      description: 'A complete web-based operating system in your browser.',
      url: 'https://lumios.wasmer.app',
      preview: 'Browser OS',
      embed: true,
      category: 'utility',
      thumbnail: 'https://raw.githubusercontent.com/LuminesenceProject/LumiOS/refs/heads/main/images/discord.png',
    },
    {
      title: 'Kermitco',
      description: 'Unique gaming experience with creative challenges and fun.',
      url: 'https://kermitcooffline82hfdisocirk88enlqtpc75wchgb45cstvvixmc-12367506.codehs.me/0aDV71GtSpyy91KtZE6P7qeL56mVU5nSvCKNk5fdoGV6N1xy1qsbFa548gBQcARY.html',
      preview: 'Creative adventure',
      embed: true,
      category: 'arcade',
      thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    },
    {
      title: 'Cobra',
      description: 'Professional business platform with powerful productivity tools.',
      url: 'https://thecobra.odoo.com/',
      preview: 'Business platform',
      embed: true,
      category: 'utility',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    },
    {
      title: 'Car Game',
      description: 'Get behind the wheel and race through exciting tracks.',
      url: 'https://codebeautify.org/htmlviewer/y25205daf#',
      preview: 'Racing game',
      embed: true,
      category: 'racing',
      thumbnail: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=300&fit=crop',
    },
    {
      title: 'Mathepic',
      description: 'All credits to gooierpizza7003!',
      url: 'https://mathepic.tuvnord.hk/',
      preview: 'Math learning game',
      embed: true,
      category: 'arcade',
      thumbnail: 'https://img.gamepix.com/games/mathpup-math-adventure-integers/cover/mathpup-math-adventure-integers.png',
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
    <div className="max-w-6xl mx-auto px-2 md:px-0">
      {/* Header */}
      <div className="text-center mb-6 md:mb-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 text-gradient">
          Game Library
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          {games.length} games available
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-6 md:mb-8 px-2 md:px-0">
        <Search className="absolute left-6 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-full pl-11 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-6 md:mb-10 px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline md:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12 md:py-16">
          <Gamepad2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground text-base md:text-lg">No games found</p>
          <p className="text-muted-foreground/70 text-xs md:text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
          {filteredGames.map((game) => {
            const emoji = getGameEmoji(game.title, game.category);
            return (
              <button
                key={game.title}
                onClick={() => onGameClick(game.url, game.title, game.embed, game.isTab)}
                className="group relative bg-card border border-border/40 rounded-xl md:rounded-2xl overflow-hidden text-left hover:border-primary/60 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
              >
                {/* Thumbnail Image */}
                <div className="relative w-full h-32 md:h-40 overflow-hidden">
                  {game.thumbnail ? (
                    <img 
                      src={game.thumbnail} 
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-4xl md:text-5xl">{emoji}</span>
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground fill-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  
                  {/* Category badge */}
                  <div className="absolute top-2 md:top-3 right-2 md:right-3">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-wider bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-foreground font-medium">
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{emoji}</span>
                    <h3 className="font-semibold text-foreground text-sm md:text-base truncate group-hover:text-primary transition-colors">
                      {game.title}
                    </h3>
                  </div>
                  <p className="text-[10px] md:text-xs text-primary/80 font-medium mb-1">{game.preview}</p>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}