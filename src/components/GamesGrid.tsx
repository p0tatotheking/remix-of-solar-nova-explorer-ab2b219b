import { Gamepad2, Music, Star, Zap, Trophy, Target } from 'lucide-react';

interface Game {
  title: string;
  description: string;
  url: string;
  icon: string;
  preview: string;
  embed?: boolean;
}

interface GamesGridProps {
  onGameClick: (url: string, title: string, embed?: boolean) => void;
}

export function GamesGrid({ onGameClick }: GamesGridProps) {
  const games: Game[] = [
    {
      title: 'Friday Night Funkin',
      description: 'Test your rhythm skills in this addictive music battle game. Follow the beat and outperform your opponents in epic rap battles.',
      url: 'https://fnfcbn.wasmer.app/',
      icon: 'star',
      preview: 'Rhythm-based music game with epic battles',
      embed: true,
    },
    {
      title: 'Unblocked Games',
      description: 'Access a massive collection of unblocked games. Play classic favorites and discover new games all in one place.',
      url: 'https://petezahstatic.wasmer.app',
      icon: 'gamepad',
      preview: 'Huge collection of classic games',
    },
    {
      title: 'Solarnova Music Player',
      description: 'Stream and enjoy your favorite music with our sleek, feature-rich music player. Create playlists and discover new tracks.',
      url: 'https://solornova.wasmer.app',
      icon: 'music',
      preview: 'Advanced music streaming platform',
    },
    {
      title: 'Arcade Classics',
      description: 'Relive the golden age of gaming with authentic arcade classics. High scores and nostalgic gameplay await.',
      url: 'https://petezahstatic.wasmer.app',
      icon: 'zap',
      preview: 'Retro arcade gaming experience',
    },
    {
      title: 'Multiplayer Arena',
      description: 'Compete against players worldwide in real-time multiplayer battles. Climb the leaderboards and prove your skills.',
      url: 'https://petezahstatic.wasmer.app',
      icon: 'trophy',
      preview: 'Global competitive gaming',
    },
    {
      title: 'Puzzle Masters',
      description: 'Challenge your mind with brain-teasing puzzles and logic games. Perfect for sharpening your problem-solving skills.',
      url: 'https://petezahstatic.wasmer.app',
      icon: 'target',
      preview: 'Mind-bending puzzle collection',
    },
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      star: Star,
      gamepad: Gamepad2,
      music: Music,
      zap: Zap,
      trophy: Trophy,
      target: Target,
    };
    return icons[iconName as keyof typeof icons] || Gamepad2;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
          Featured Games
        </h2>
        <p className="text-muted-foreground text-lg">
          Explore our curated collection of premium gaming experiences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => {
          const Icon = getIcon(game.icon);
          return (
            <button
              key={game.title}
              onClick={() => onGameClick(game.url, game.title, game.embed)}
              className="group bg-gradient-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/60 transition-all duration-300 hover:scale-105 hover:shadow-card-hover text-left"
            >
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-background/40" />
                <Icon className="w-24 h-24 text-primary/50 group-hover:text-primary/70 transition-all duration-300 group-hover:scale-110 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {game.title}
                  </h3>
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                </div>

                <p className="text-sm text-primary mb-3 font-medium">
                  {game.preview}
                </p>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {game.description}
                </p>

                <div className="mt-4 pt-4 border-t border-border/20">
                  <span className="text-primary text-sm font-semibold group-hover:text-secondary transition-colors">
                    {game.embed ? 'Play Now →' : 'Open Game →'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
