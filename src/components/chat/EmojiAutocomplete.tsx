import { getEmojiSuggestions } from '@/lib/emojiParser';

interface EmojiAutocompleteProps {
  query: string;
  onSelect: (emoji: string, code: string) => void;
}

export function EmojiAutocomplete({ query, onSelect }: EmojiAutocompleteProps) {
  const suggestions = getEmojiSuggestions(query, 8);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50">
      <div className="p-1 max-h-48 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.code}-${index}`}
            onClick={() => onSelect(suggestion.emoji, suggestion.code)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded transition-colors text-left"
          >
            <span className="text-xl">{suggestion.emoji}</span>
            <span className="text-sm text-muted-foreground">:{suggestion.code}:</span>
          </button>
        ))}
      </div>
    </div>
  );
}
