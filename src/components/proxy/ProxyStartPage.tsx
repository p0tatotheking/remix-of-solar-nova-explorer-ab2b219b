import React, { useState } from 'react';
import { Search, Globe, Gamepad2, Youtube, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProxy, SearchEngine } from '@/contexts/ProxyContext';
import solarnovaIcon from '@/assets/solarnova-icon.png';

const quickLinks = [
  { name: 'Google', url: 'https://www.google.com', icon: Globe, color: 'from-blue-500 to-green-500' },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: Youtube, color: 'from-red-500 to-red-600' },
  { name: 'CrazyGames', url: 'https://www.crazygames.com', icon: Gamepad2, color: 'from-purple-500 to-pink-500' },
  { name: 'SoundCloud', url: 'https://www.soundcloud.com', icon: Music, color: 'from-orange-500 to-orange-600' },
];

const searchEngines: { id: SearchEngine; name: string; placeholder: string }[] = [
  { id: 'google', name: 'Google', placeholder: 'Search Google or type a URL' },
  { id: 'bing', name: 'Bing', placeholder: 'Search Bing or type a URL' },
  { id: 'duckduckgo', name: 'DuckDuckGo', placeholder: 'Search DuckDuckGo or type a URL' },
];

export function ProxyStartPage() {
  const { navigate, searchEngine, setSearchEngine } = useProxy();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    let url = searchQuery.trim();
    
    // Check if it looks like a URL
    if (url.includes('.') && !url.includes(' ')) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
    } else {
      // Convert to search URL
      switch (searchEngine) {
        case 'bing':
          url = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;
          break;
        case 'duckduckgo':
          url = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
          break;
        default:
          url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      }
    }

    navigate(url);
  };

  const currentEngine = searchEngines.find(e => e.id === searchEngine) || searchEngines[0];

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 bg-gradient-to-b from-background to-muted/20">
      {/* Logo and Title */}
      <div className="flex flex-col items-center gap-4 mb-12 animate-fade-in">
        <img 
          src={solarnovaIcon} 
          alt="Solarnova Proxy" 
          className="w-24 h-24 drop-shadow-2xl"
        />
        <h1 className="text-4xl font-bold text-gradient">Solarnova Proxy</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Browse the web freely and securely through Solarnova's built-in proxy browser
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={currentEngine.placeholder}
            className="pl-12 pr-4 py-6 text-lg bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-full shadow-lg"
            autoFocus
          />
        </div>
      </form>

      {/* Search Engine Selector */}
      <div className="flex items-center gap-2 mb-12">
        <span className="text-sm text-muted-foreground">Search with:</span>
        <div className="flex gap-2">
          {searchEngines.map((engine) => (
            <button
              key={engine.id}
              onClick={() => setSearchEngine(engine.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                searchEngine === engine.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {engine.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="w-full max-w-2xl">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.url)}
              className="flex flex-col items-center gap-3 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-background/80 transition-all group"
            >
              <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color} text-white group-hover:scale-110 transition-transform`}>
                <link.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">{link.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-12 text-center text-xs text-muted-foreground/60 max-w-md">
        <p>💡 Tip: Type a URL directly or search with your preferred search engine</p>
        <p className="mt-1">Some websites may not work due to their security settings</p>
      </div>
    </div>
  );
}
