import { useState, useRef, useEffect } from 'react';
import { Send, Users, MessageSquare, Hash, UserPlus, Bell, BellOff, Ban, Check, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { censorText } from '@/lib/profanityFilter';
import solarnovaIcon from '@/assets/solarnova-icon.png';

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface AppUser {
  id: string;
  username: string;
  created_at: string;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  status: string;
  created_at: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
}

interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
}

interface MuteSetting {
  id: string;
  user_id: string;
  muted_user_id: string;
  mute_until: string | null;
}

type ChatView = 'server' | 'friends' | 'dm';

export function DiscordChat() {
  const { user } = useAuth();
  const [view, setView] = useState<ChatView>('server');
  const [selectedDmUser, setSelectedDmUser] = useState<AppUser | null>(null);
  
  // Server chat
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  
  // DM
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  
  // Friends system
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [muteSettings, setMuteSettings] = useState<MuteSetting[]>([]);
  
  // Notifications
  const [showNotification, setShowNotification] = useState<FriendRequest | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showMuteDialog, setShowMuteDialog] = useState<string | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all data on mount
  useEffect(() => {
    if (!user) return;
    
    fetchServerMessages();
    fetchAllUsers();
    fetchFriendRequests();
    fetchFriendships();
    fetchBlocks();
    fetchMuteSettings();
    
    // Subscribe to server messages
    const serverChannel = supabase
      .channel('server-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setServerMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    
    // Subscribe to DMs
    const dmChannel = supabase
      .channel('direct-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const newDm = payload.new as DirectMessage;
        if (newDm.receiver_id === user.id || newDm.sender_id === user.id) {
          setDmMessages(prev => [...prev, newDm]);
          
          // Show notification if not muted
          if (newDm.sender_id !== user.id) {
            const isMuted = muteSettings.some(m => 
              m.muted_user_id === newDm.sender_id && 
              (!m.mute_until || new Date(m.mute_until) > new Date())
            );
            if (!isMuted) {
              setUnreadCounts(prev => ({
                ...prev,
                [newDm.sender_id]: (prev[newDm.sender_id] || 0) + 1
              }));
            }
          }
        }
      })
      .subscribe();
    
    // Subscribe to friend requests
    const frChannel = supabase
      .channel('friend-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, (payload) => {
        const newRequest = payload.new as FriendRequest;
        if (newRequest.to_user_id === user.id && newRequest.status === 'pending') {
          setShowNotification(newRequest);
          setFriendRequests(prev => [...prev, newRequest]);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(serverChannel);
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(frChannel);
    };
  }, [user]);

  // Track previous message counts to only scroll on new messages
  const prevServerMessagesCount = useRef(serverMessages.length);
  const prevDmMessagesCount = useRef(dmMessages.length);

  // Scroll to bottom only when new messages arrive
  useEffect(() => {
    if (serverMessages.length > prevServerMessagesCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevServerMessagesCount.current = serverMessages.length;
  }, [serverMessages.length]);

  useEffect(() => {
    if (dmMessages.length > prevDmMessagesCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevDmMessagesCount.current = dmMessages.length;
  }, [dmMessages.length]);

  const fetchServerMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    setServerMessages(data || []);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.rpc('get_all_app_users');
    setAllUsers(data || []);
  };

  const fetchFriendRequests = async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_user_id.eq.${user?.id},to_user_id.eq.${user?.id}`);
    setFriendRequests(data || []);
  };

  const fetchFriendships = async () => {
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);
    setFriendships(data || []);
  };

  const fetchBlocks = async () => {
    const { data } = await supabase.from('user_blocks').select('*');
    setBlocks(data || []);
  };

  const fetchMuteSettings = async () => {
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user?.id);
    setMuteSettings(data || []);
  };

  const fetchDmMessages = async (otherUserId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });
    setDmMessages(data || []);
    
    // Mark as read
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('receiver_id', user?.id)
      .eq('sender_id', otherUserId);
    
    setUnreadCounts(prev => ({ ...prev, [otherUserId]: 0 }));
  };

  const isFriend = (userId: string) => {
    return friendships.some(f => 
      (f.user_id === user?.id && f.friend_id === userId) ||
      (f.friend_id === user?.id && f.user_id === userId)
    );
  };

  const hasPendingRequest = (userId: string) => {
    return friendRequests.some(fr => 
      ((fr.from_user_id === user?.id && fr.to_user_id === userId) ||
       (fr.to_user_id === user?.id && fr.from_user_id === userId)) &&
      fr.status === 'pending'
    );
  };

  const isBlocked = (userId: string) => {
    return blocks.some(b => b.blocker_id === user?.id && b.blocked_id === userId);
  };

  const isBlockedBy = (userId: string) => {
    return blocks.some(b => b.blocker_id === userId && b.blocked_id === user?.id);
  };

  const sendFriendRequest = async (toUser: AppUser) => {
    if (!user) return;
    await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      from_username: user.username,
      to_user_id: toUser.id,
      to_username: toUser.username,
    });
    fetchFriendRequests();
  };

  const acceptFriendRequest = async (request: FriendRequest) => {
    if (!user) return;
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', request.id);
    await supabase.from('friendships').insert([
      { user_id: request.from_user_id, friend_id: request.to_user_id },
      { user_id: request.to_user_id, friend_id: request.from_user_id },
    ]);
    setShowNotification(null);
    fetchFriendRequests();
    fetchFriendships();
  };

  const rejectFriendRequest = async (request: FriendRequest) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', request.id);
    setShowNotification(null);
    fetchFriendRequests();
  };

  const blockUser = async (userId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').insert({ blocker_id: user.id, blocked_id: userId });
    fetchBlocks();
  };

  const unblockUser = async (userId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
    fetchBlocks();
  };

  const muteUser = async (userId: string, duration: string | null) => {
    if (!user) return;
    const muteUntil = duration ? new Date(Date.now() + parseInt(duration)).toISOString() : null;
    
    const existing = muteSettings.find(m => m.muted_user_id === userId);
    if (existing) {
      await supabase.from('notification_settings').update({ mute_until: muteUntil }).eq('id', existing.id);
    } else {
      await supabase.from('notification_settings').insert({
        user_id: user.id,
        muted_user_id: userId,
        mute_until: muteUntil,
      });
    }
    fetchMuteSettings();
    setShowMuteDialog(null);
  };

  const unmuteUser = async (userId: string) => {
    if (!user) return;
    await supabase.from('notification_settings').delete().eq('user_id', user.id).eq('muted_user_id', userId);
    fetchMuteSettings();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading || !user) return;

    setIsLoading(true);
    const censoredMessage = censorText(newMessage.trim());

    if (view === 'server') {
      await supabase.from('chat_messages').insert({
        username: user.username,
        message: censoredMessage,
      });
    } else if (view === 'dm' && selectedDmUser) {
      await supabase.from('direct_messages').insert({
        sender_id: user.id,
        sender_username: user.username,
        receiver_id: selectedDmUser.id,
        receiver_username: selectedDmUser.username,
        message: censoredMessage,
      });
    }

    setNewMessage('');
    setIsLoading(false);
  };

  const openDm = (dmUser: AppUser) => {
    if (isBlockedBy(dmUser.id)) return;
    if (!isFriend(dmUser.id) && !hasPendingRequest(dmUser.id)) {
      sendFriendRequest(dmUser);
      return;
    }
    if (!isFriend(dmUser.id)) return;
    
    setSelectedDmUser(dmUser);
    setView('dm');
    fetchDmMessages(dmUser.id);
  };

  const friends = allUsers.filter(u => u.id !== user?.id && isFriend(u.id));
  const pendingRequests = friendRequests.filter(fr => fr.to_user_id === user?.id && fr.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Friend Request Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-2xl animate-fade-in max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Friend Request</p>
              <p className="text-sm text-muted-foreground">{showNotification.from_username} wants to be your friend</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => acceptFriendRequest(showNotification)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
            <button
              onClick={() => rejectFriendRequest(showNotification)}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Decline
            </button>
          </div>
        </div>
      )}

      {/* Mute Dialog */}
      {showMuteDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Mute Notifications</h3>
            <div className="space-y-2">
              <button onClick={() => muteUser(showMuteDialog, '3600000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Hour</button>
              <button onClick={() => muteUser(showMuteDialog, '86400000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Day</button>
              <button onClick={() => muteUser(showMuteDialog, '604800000')} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">1 Week</button>
              <button onClick={() => muteUser(showMuteDialog, null)} className="w-full text-left px-4 py-2 hover:bg-muted rounded-lg">Forever</button>
            </div>
            <button onClick={() => setShowMuteDialog(null)} className="mt-4 w-full py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Server sidebar */}
      <div className="w-16 bg-background border-r border-border/30 flex flex-col items-center py-4 gap-2">
        <button
          onClick={() => { setView('server'); setSelectedDmUser(null); }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            view === 'server' ? 'bg-primary rounded-xl' : 'bg-muted hover:bg-muted/80 hover:rounded-xl'
          }`}
        >
          <img src={solarnovaIcon} alt="Server" className="w-8 h-8" />
        </button>
        <div className="w-8 h-0.5 bg-border rounded-full my-2" />
        <button
          onClick={() => { setView('friends'); setSelectedDmUser(null); }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            view === 'friends' || view === 'dm' ? 'bg-primary rounded-xl' : 'bg-muted hover:bg-muted/80 hover:rounded-xl'
          }`}
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      {/* Channel/DM sidebar */}
      <div className="w-60 bg-card/50 border-r border-border/30 flex flex-col">
        {view === 'server' ? (
          <>
            <div className="p-4 border-b border-border/30">
              <h2 className="font-bold text-foreground">Solarnova Server</h2>
            </div>
            <div className="p-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-foreground">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span>general</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border/30">
              <h2 className="font-bold text-foreground">Direct Messages</h2>
            </div>
            {pendingRequests.length > 0 && (
              <div className="p-2 border-b border-border/30">
                <p className="text-xs text-muted-foreground px-2 mb-2">PENDING REQUESTS</p>
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-2 px-2 py-1">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs">
                      {req.from_username[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm truncate">{req.from_username}</span>
                    <button onClick={() => acceptFriendRequest(req)} className="p-1 hover:bg-green-600 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => rejectFriendRequest(req)} className="p-1 hover:bg-destructive rounded"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
              <p className="text-xs text-muted-foreground px-2 mb-2">FRIENDS — {friends.length}</p>
              {friends.map(friend => {
                const isMuted = muteSettings.some(m => m.muted_user_id === friend.id);
                const unread = unreadCounts[friend.id] || 0;
                
                return (
                  <button
                    key={friend.id}
                    onClick={() => openDm(friend)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 ${
                      selectedDmUser?.id === friend.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs relative">
                      {friend.username[0].toUpperCase()}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 text-sm truncate text-left">{friend.username}</span>
                    {isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                  </button>
                );
              })}
              
              <p className="text-xs text-muted-foreground px-2 mt-4 mb-2">ALL USERS</p>
              {allUsers.filter(u => u.id !== user?.id && !isFriend(u.id)).map(otherUser => (
                <button
                  key={otherUser.id}
                  onClick={() => openDm(otherUser)}
                  disabled={isBlockedBy(otherUser.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs">
                    {otherUser.username[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm truncate text-left text-muted-foreground">{otherUser.username}</span>
                  {hasPendingRequest(otherUser.id) ? (
                    <span className="text-xs text-yellow-500">Pending</span>
                  ) : (
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="h-12 border-b border-border/30 flex items-center px-4 gap-2">
          {view === 'server' ? (
            <>
              <Hash className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">general</span>
            </>
          ) : view === 'dm' && selectedDmUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center text-xs">
                  {selectedDmUser.username[0].toUpperCase()}
                </div>
                <span className="font-semibold">{selectedDmUser.username}</span>
              </div>
              <div className="flex items-center gap-2">
                {muteSettings.some(m => m.muted_user_id === selectedDmUser.id) ? (
                  <button onClick={() => unmuteUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg" title="Unmute">
                    <Bell className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setShowMuteDialog(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg" title="Mute">
                    <BellOff className="w-4 h-4" />
                  </button>
                )}
                {isBlocked(selectedDmUser.id) ? (
                  <button onClick={() => unblockUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg text-green-500" title="Unblock">
                    <Ban className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => blockUser(selectedDmUser.id)} className="p-2 hover:bg-muted rounded-lg text-destructive" title="Block">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold">Friends</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {view === 'server' ? (
            serverMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              serverMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3 hover:bg-muted/20 px-2 py-1 rounded">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    {msg.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-foreground">{msg.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground/90">{msg.message}</p>
                  </div>
                </div>
              ))
            )
          ) : view === 'dm' && selectedDmUser ? (
            dmMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet with {selectedDmUser.username}</p>
                </div>
              </div>
            ) : (
              dmMessages.map((msg) => (
                <div key={msg.id} className="flex gap-3 hover:bg-muted/20 px-2 py-1 rounded">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    {msg.sender_username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-foreground">{msg.sender_username}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground/90">{msg.message}</p>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a friend to start chatting</p>
                <p className="text-sm mt-2">Or click on a user to send a friend request</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        {(view === 'server' || (view === 'dm' && selectedDmUser && !isBlocked(selectedDmUser.id) && !isBlockedBy(selectedDmUser.id))) && (
          <form onSubmit={sendMessage} className="p-4 border-t border-border/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-muted border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder={view === 'server' ? 'Message #general' : `Message ${selectedDmUser?.username}`}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-primary hover:opacity-90 p-3 rounded-lg transition-all duration-300 disabled:opacity-50"
              >
                <Send className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}