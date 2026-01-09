import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGifs = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('giphy-gifs', {
        body: { query: query || 'trending', limit: 20 },
      });

      if (fnError) throw fnError;
      
      if (data?.results) {
        setGifs(data.results);
      }
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setError('Failed to load GIFs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    searchGifs('');
  }, [searchGifs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        searchGifs(search);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search, searchGifs]);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 md:w-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">GIFs</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Giphy..."
            className="w-full bg-muted border border-border/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>
      </div>
      
      {/* Results */}
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {error}
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelect(gif.url);
                  onClose();
                }}
                className="relative aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-border text-center">
        <span className="text-xs text-muted-foreground">Powered by Giphy</span>
      </div>
    </div>
  );
}
