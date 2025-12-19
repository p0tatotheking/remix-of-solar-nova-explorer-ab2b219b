import { Gamepad2, Music, Star, Zap, Trophy, Target, Sparkles, CarFront, Play, ExternalLink } from 'lucide-react';

interface Game {
  title: string;
  description: string;
  url: string;
  icon: string;
  preview: string;
  embed?: boolean;
  isTab?: string;
  gradient: string;
}

interface GamesGridProps {
  onGameClick: (url: string, title: string, embed?: boolean, isTab?: string) => void;
}

// Auto-generated game icons based on title
const getGameIcon = (title: string) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('music') || titleLower.includes('funkin')) return '🎵';
  if (titleLower.includes('car') || titleLower.includes('race') || titleLower.includes('drive')) return '🏎️';
  if (titleLower.includes('snake') || titleLower.includes('cobra')) return '🐍';
  if (titleLower.includes('lumi') || titleLower.includes('os')) return '💻';
  if (titleLower.includes('game') || titleLower.includes('petezah')) return '🎮';
  if (titleLower.includes('umbrion')) return '⚡';
  if (titleLower.includes('kermit')) return '🐸';
  return '🎯';
};

export function GamesGrid({ onGameClick }: GamesGridProps) {
  const games: Game[] = [
    {
      title: 'Friday Night Funkin',
      description: 'Test your rhythm skills in this addictive music battle game.',
      url: 'https://fnfcbn.wasmer.app/',
      icon: 'star',
      preview: 'Rhythm Battle',
      embed: true,
      gradient: 'from-pink-500 to-purple-600',
    },
    {
      title: 'Petezah Games',
      description: 'Access a massive collection of unblocked games.',
      url: 'https://petezahstatic.wasmer.app',
      icon: 'gamepad',
      preview: 'Game Hub',
      embed: true,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Solarnova Music',
      description: 'Stream your favorite music with our sleek player.',
      url: '',
      icon: 'music',
      preview: 'Music Player',
      isTab: 'music',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Umbrion Games',
      description: 'Explore creative indie game projects.',
      url: 'https://umbrion.wasmer.app/projects.html',
      icon: 'zap',
      preview: 'Indie Games',
      embed: true,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'Lumi OS',
      description: 'A complete desktop environment in your browser.',
      url: 'https://lumios.wasmer.app',
      icon: 'trophy',
      preview: 'Web OS',
      embed: true,
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Kermitco',
      description: 'Unique gaming experience with creative challenges.',
      url: 'https://kermitcooffline82hfdisocirk88enlqtpc75wchgb45cstvvixmc-12367506.codehs.me/0aDV71GtSpyy91KtZE6P7qeL56mVU5nSvCKNk5fdoGV6N1xy1qsbFa548gBQcARY.html',
      icon: 'target',
      preview: 'Adventure',
      embed: true,
      gradient: 'from-lime-500 to-green-600',
    },
    {
      title: 'Cobra',
      description: 'Professional business platform with powerful tools.',
      url: 'https://thecobra.odoo.com/',
      icon: 'snake',
      preview: 'Business',
      embed: true,
      gradient: 'from-red-500 to-rose-600',
    },
    {
      title: 'Car Game',
      description: 'Get behind the wheel and race through exciting tracks.',
      url: 'https://codebeautify.org/htmlviewer/y25205daf#',
      icon: 'car',
      preview: 'Racing',
      embed: true,
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-5xl md:text-6xl font-black mb-4 text-gradient tracking-tight">
          Games
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Premium gaming experiences, ready to play
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {games.map((game) => {
          const emoji = getGameIcon(game.title);
          return (
            <button
              key={game.title}
              onClick={() => onGameClick(game.url, game.title, game.embed, game.isTab)}
              className="group relative aspect-square rounded-3xl overflow-hidden transition-all duration-500 hover:scale-105 hover:z-10"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
              
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_70%)]" />
              
              {/* Glow effect on hover */}
              <div className={`absolute -inset-1 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500`} />
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-white">
                {/* Large emoji icon */}
                <span className="text-5xl md:text-6xl mb-3 transform group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 drop-shadow-lg">
                  {emoji}
                </span>
                
                {/* Title */}
                <h3 className="text-sm md:text-base font-bold text-center leading-tight drop-shadow-md">
                  {game.title}
                </h3>
                
                {/* Preview tag */}
                <span className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {game.preview}
                </span>
              </div>
              
              {/* Play indicator on hover */}
              <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}