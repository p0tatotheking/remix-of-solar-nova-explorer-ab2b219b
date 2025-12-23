import { useState } from 'react';
import { Plus, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  messageType: 'server' | 'dm';
  reactions: Record<string, { users: string[]; usernames: string[] }>;
  onReactionChange: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '💀', '🎉'];

export function MessageReactions({ messageId, messageType, reactions, onReactionChange }: MessageReactionsProps) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;

    const userReacted = reactions[emoji]?.users.includes(user.id);

    if (userReacted) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          username: user.username,
          emoji,
          message_type: messageType,
        });
    }

    onReactionChange();
    setShowPicker(false);
  };

  const reactionEntries = Object.entries(reactions);

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactionEntries.map(([emoji, data]) => {
        const userReacted = user && data.users.includes(user.id);
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
              userReacted 
                ? 'bg-primary/30 border border-primary/50' 
                : 'bg-muted/50 border border-transparent hover:bg-muted'
            }`}
            title={data.usernames.join(', ')}
          >
            <span>{emoji}</span>
            <span className="text-muted-foreground">{data.users.length}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          <Plus className="w-3 h-3" />
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-xl p-2 z-50">
            <div className="flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
