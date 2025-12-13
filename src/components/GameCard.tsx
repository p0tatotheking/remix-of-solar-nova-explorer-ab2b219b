import { LucideIcon } from 'lucide-react';

interface GameCardProps {
  title: string;
  description: string;
  url?: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function GameCard({ title, description, url, icon: Icon, onClick }: GameCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  if (onClick && !url) {
    return (
      <button
        onClick={onClick}
        className="group relative bg-gradient-card border border-border/30 rounded-xl p-8 hover:border-primary/60 transition-all duration-300 hover:scale-105 hover:shadow-card-hover text-left"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/10 rounded-xl transition-all duration-300" />

        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-8 h-8 text-foreground" />
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </button>
    );
  }

  return (
    <a
      href={url}
      onClick={onClick ? handleClick : undefined}
      target={onClick ? undefined : "_blank"}
      rel={onClick ? undefined : "noopener noreferrer"}
      className="group relative bg-gradient-card border border-border/30 rounded-xl p-8 hover:border-primary/60 transition-all duration-300 hover:scale-105 hover:shadow-card-hover"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/10 rounded-xl transition-all duration-300" />

      <div className="relative z-10">
        <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-8 h-8 text-foreground" />
        </div>

        <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </a>
  );
}
