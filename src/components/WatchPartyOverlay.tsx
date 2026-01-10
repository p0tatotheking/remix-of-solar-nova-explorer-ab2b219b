import { useState, useEffect, useRef } from 'react';
import { X, Users, Send, Copy, Check, UserPlus, MonitorUp, MonitorOff, Loader2 } from 'lucide-react';
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
  
  // Screen sharing state
  const [isHost, setIsHost] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

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

  // Setup signaling channel
  useEffect(() => {
    if (!partyStarted || !user) return;

    const channel = supabase.channel(`watch-party-${partyId.current}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as WatchPartyMessage]);
      })
      .on('broadcast', { event: 'webrtc-offer' }, async (payload) => {
        // Viewer receives offer
        if (payload.payload.senderId !== user.id) {
          await handleOffer(payload.payload.offer);
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async (payload) => {
        // Host receives answer
        if (payload.payload.senderId !== user.id && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.payload.answer)
          );
        }
      })
      .on('broadcast', { event: 'webrtc-ice-candidate' }, async (payload) => {
        // Both sides receive ICE candidates
        if (payload.payload.senderId !== user.id && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(payload.payload.candidate)
            );
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
      })
      .on('broadcast', { event: 'host-sharing' }, (payload) => {
        // Viewers know host started sharing
        if (payload.payload.senderId !== user.id) {
          setIsConnecting(true);
        }
      })
      .on('broadcast', { event: 'host-stopped' }, (payload) => {
        // Viewers know host stopped sharing
        if (payload.payload.senderId !== user.id) {
          setRemoteStream(null);
          setIsConnecting(false);
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopSharing();
    };
  }, [partyStarted, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Display remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(rtcConfig);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-ice-candidate',
          payload: { senderId: user!.id, candidate: event.candidate.toJSON() }
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setIsConnecting(false);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStream(null);
        setIsConnecting(false);
      }
    };

    return pc;
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { senderId: user!.id, answer: answer }
      });
    }
  };

  const startSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true
      });

      localStreamRef.current = stream;
      setIsSharing(true);
      setIsHost(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection for each viewer
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

      // Notify viewers that host is sharing
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'host-sharing',
          payload: { senderId: user!.id }
        });
      }

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-offer',
          payload: { senderId: user!.id, offer: offer }
        });
      }

      toast.success('Screen sharing started!');
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast.error('Failed to start screen sharing');
    }
  };

  const stopSharing = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setIsSharing(false);

    // Notify viewers that host stopped
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'host-stopped',
        payload: { senderId: user!.id }
      });
    }
  };

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
        message: `🎬 ${user!.username} invited you to a Watch Party! Join them now!`,
      });
    }

    setPartyStarted(true);
    setIsHost(true);
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
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: messageData,
      });
    }

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
      <div className="w-full max-w-4xl bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Watch Party</h2>
              <p className="text-xs text-muted-foreground">
                {partyStarted
                  ? `${selectedFriends.length + 1} in party${isSharing ? ' • Sharing screen' : ''}`
                  : 'Invite friends to watch together'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSharing();
              onClose();
            }}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {!partyStarted ? (
          /* Friend Selection */
          <div className="p-4 overflow-y-auto">
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
          /* Watch Party with Screen Sharing */
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Video/Screen Section */}
            <div className="flex-1 bg-black/50 flex flex-col min-h-[200px] lg:min-h-0">
              {/* Screen Display */}
              <div className="flex-1 relative flex items-center justify-center">
                {isSharing && localVideoRef ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : isConnecting ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Waiting for host to share...</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <MonitorUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm mb-4">
                      {isHost ? 'Share your screen to start watching together' : 'Waiting for host to share their screen...'}
                    </p>
                    {isHost && (
                      <button
                        onClick={startSharing}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 mx-auto"
                      >
                        <MonitorUp className="w-4 h-4" />
                        Share Screen
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Screen sharing controls */}
              {isHost && partyStarted && (
                <div className="p-3 border-t border-border/30 flex justify-center gap-2 bg-background/50">
                  {isSharing ? (
                    <button
                      onClick={stopSharing}
                      className="px-4 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MonitorOff className="w-4 h-4" />
                      Stop Sharing
                    </button>
                  ) : (
                    <button
                      onClick={startSharing}
                      className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MonitorUp className="w-4 h-4" />
                      Share Screen
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chat Section */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 flex flex-col h-64 lg:h-auto">
              {/* Party link */}
              <div className="p-3 border-b border-border/30 flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {selectedFriends.map((f) => f.username).join(', ')}
                </span>
                <button
                  onClick={copyPartyLink}
                  className="flex items-center gap-1 px-2 py-1 bg-muted/30 hover:bg-muted/50 rounded text-xs"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Start chatting!
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
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border/30 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Chat..."
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
          </div>
        )}
      </div>
    </div>
  );
}