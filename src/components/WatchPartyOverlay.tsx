import { useState, useEffect, useRef } from 'react';
import { X, Users, Send, ArrowLeft, Copy, Check, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { censorText } from '@/lib/profanityFilter';
import { toast } from 'sonner';

interface Friend {
  id: string;
  username: string;
}

interface WatchPartyMessage {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface WatchPartyOverlayProps {
  onClose: () => void;
}

export function WatchPartyOverlay({ onClose }: WatchPartyOverlayProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [partyStarted, setPartyStarted] = useState(false);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partyId = useRef(`party-${Date.now()}`);

  // Fetch friends
  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f) => f.friend_id);
        const { data: allUsers } = await supabase.rpc('get_all_app_users');

        if (allUsers) {
          const friendUsers = allUsers.filter((u: { id: string; username: string }) =>
            friendIds.includes(u.id)
          );
          setFriends(friendUsers);
        }
      }
    };

    fetchFriends();
  }, [user]);

  // Subscribe to watch party messages
  useEffect(() => {
    if (!partyStarted) return;

    const channel = supabase
      .channel(`watch-party-${partyId.current}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as WatchPartyMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyStarted]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleFriendSelection = (friend: Friend) => {
    setSelectedFriends((prev) =>
      prev.find((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const startParty = async () => {
    if (selectedFriends.length === 0) {
      toast.error('Select at least one friend to start a watch party');
      return;
    }

    // Send invites via DM
    for (const friend of selectedFriends) {
      await supabase.from('direct_messages').insert({
        sender_id: user!.id,
        sender_username: user!.username,
        receiver_id: friend.id,
        receiver_username: friend.username,
        message: `🎬 ${user!.username} invited you to a Watch Party! Join them in TV & Movies!`,
      });
    }

    setPartyStarted(true);
    toast.success(`Invites sent to ${selectedFriends.length} friend(s)!`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    const censoredMessage = censorText(newMessage.trim());

    const messageData: WatchPartyMessage = {
      id: `${Date.now()}-${user.id}`,
      username: user.username,
      message: censoredMessage,
      created_at: new Date().toISOString(),
    };

    // Broadcast to all party members
    await supabase.channel(`watch-party-${partyId.current}`).send({
      type: 'broadcast',
      event: 'message',
      payload: messageData,
    });

    // Add locally as well
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
    setIsSending(false);
  };

  const copyPartyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[150] bg-background/95 backdrop-blur-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Login to start a watch party</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-muted/30 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-background/95 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Watch Party</h2>
              <p className="text-xs text-muted-foreground">
                {partyStarted
                  ? `${selectedFriends.length + 1} watching`
                  : 'Invite friends to watch together'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {!partyStarted ? (
          /* Friend Selection */
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Select friends to invite:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No friends yet. Add friends from the chatroom!
                </p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriends.find((f) => f.id === friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriendSelection(friend)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-muted/20 hover:bg-muted/30 border border-transparent'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary text-sm font-medium">
                          {friend.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-foreground flex-1 text-left">
                        {friend.username}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={startParty}
              disabled={selectedFriends.length === 0}
              className="w-full mt-4 py-3 bg-gradient-primary hover:opacity-90 text-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Start Watch Party ({selectedFriends.length} selected)
            </button>
          </div>
        ) : (
          /* Watch Party Chat */
          <div className="flex flex-col h-80">
            {/* Party link */}
            <div className="p-3 border-b border-border/30 flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1 truncate">
                Watching with {selectedFriends.map((f) => f.username).join(', ')}
              </span>
              <button
                onClick={copyPartyLink}
                className="flex items-center gap-1 px-2 py-1 bg-muted/30 hover:bg-muted/50 rounded text-xs"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy Link
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Start chatting with your watch party!
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-medium text-primary">{msg.username}: </span>
                    <span className="text-foreground">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border/30 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Chat with your party..."
                className="flex-1 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
