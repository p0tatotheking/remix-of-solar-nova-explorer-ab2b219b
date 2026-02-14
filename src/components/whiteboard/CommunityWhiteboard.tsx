import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { AlertTriangle, Users } from 'lucide-react';

// Generate a consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#ff4444', '#44ff44', '#4488ff', '#ffff44', '#ff44ff',
    '#44ffff', '#ff8844', '#8844ff', '#44ff88', '#ff4488',
    '#88ff44', '#ff6600', '#00ff66', '#6600ff', '#ff0066',
    '#66ff00', '#0066ff', '#ff9933', '#33ff99', '#9933ff',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  userId?: string;
  username?: string;
}

export const CommunityWhiteboard = () => {
  const { user } = useAuth();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string; color: string }[]>([]);
  const assignedColor = user ? getUserColor(user.id) : '#ffffff';

  // Load strokes from channel on mount and listen for new ones
  useEffect(() => {
    const channel = supabase
      .channel('community-whiteboard')
      .on('broadcast', { event: 'stroke' }, (payload) => {
        setStrokes(prev => [...prev, payload.payload as Stroke]);
      })
      .on('broadcast', { event: 'clear' }, () => {
        setStrokes([]);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((p: any) => ({
          id: p.user_id,
          username: p.username,
          color: getUserColor(p.user_id),
        }));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            user_id: user.id,
            username: user.username,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleStroke = useCallback((stroke: Stroke) => {
    supabase.channel('community-whiteboard').send({
      type: 'broadcast',
      event: 'stroke',
      payload: stroke,
    });
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    supabase.channel('community-whiteboard').send({
      type: 'broadcast',
      event: 'clear',
      payload: {},
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Rules banner */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-destructive">
          <strong>Rules:</strong> No NSFW, offensive, or hateful content. No spam drawing. Violators will be banned.
        </span>
      </div>

      {/* Online users bar */}
      <div className="bg-muted/20 border-b border-border/30 px-4 py-2 flex items-center gap-3 overflow-x-auto">
        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">{onlineUsers.length} online</span>
        <div className="flex items-center gap-2">
          {onlineUsers.map(u => (
            <div key={u.id} className="flex items-center gap-1 shrink-0">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
              <span className="text-xs text-foreground">{u.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <WhiteboardCanvas
          assignedColor={assignedColor}
          strokes={strokes}
          onStroke={handleStroke}
          onClear={handleClear}
        />
      </div>
    </div>
  );
};
