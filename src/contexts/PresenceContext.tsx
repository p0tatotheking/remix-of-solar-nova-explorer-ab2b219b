import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface OnlineUser {
  id: string;
  username: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUsers: OnlineUser[];
  isUserOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const previousOnlineRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch friends list
  useEffect(() => {
    if (!user) {
      setFriends([]);
      return;
    }

    const fetchFriends = async () => {
      const { data } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (data) {
        const friendIds = data.map((f) =>
          f.user_id === user.id ? f.friend_id : f.user_id
        );
        setFriends(friendIds);
      }
    };

    fetchFriends();

    // Subscribe to friendship changes
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Track presence
  useEffect(() => {
    if (!user) {
      // Clean up if user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineUsers([]);
      previousOnlineRef.current = new Set();
      return;
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];

        Object.entries(state).forEach(([, presences]) => {
          const presenceArray = presences as Array<{ id: string; username: string; online_at: string; presence_ref: string }>;
          const presence = presenceArray[0];
          if (presence && presence.id) {
            users.push({
              id: presence.id,
              username: presence.username,
              online_at: presence.online_at,
            });
          }
        });

        // Check for newly online friends
        const currentOnline = new Set(users.map((u) => u.id));
        const previousOnline = previousOnlineRef.current;

        users.forEach((onlineUser) => {
          // If this user wasn't online before, and they're a friend, show notification
          if (
            !previousOnline.has(onlineUser.id) &&
            friends.includes(onlineUser.id) &&
            onlineUser.id !== user.id
          ) {
            toast.custom(
              () => (
                <div className="flex items-center gap-3 bg-background border border-border/50 rounded-lg px-4 py-3 shadow-lg">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {onlineUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {onlineUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground">is now online!</p>
                  </div>
                </div>
              ),
              {
                duration: 4000,
                position: 'bottom-right',
              }
            );
          }
        });

        previousOnlineRef.current = currentOnline;
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            username: user.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, friends]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some((u) => u.id === userId);
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
