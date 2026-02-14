import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Copy, Check, Users, Plus, LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  userId?: string;
  username?: string;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const RoomWhiteboard = () => {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    if (!inRoom || !roomCode) return;

    const channelName = `whiteboard-room-${roomCode}`;
    const channel = supabase
      .channel(channelName)
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
        }));
        setMembers(users);
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
  }, [inRoom, roomCode, user]);

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setStrokes([]);
    setInRoom(true);
    toast({ title: 'Room created!', description: `Share code: ${code}` });
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length < 4) {
      toast({ title: 'Invalid code', description: 'Please enter a valid room code', variant: 'destructive' });
      return;
    }
    setRoomCode(joinCode.trim().toUpperCase());
    setStrokes([]);
    setInRoom(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStroke = useCallback((stroke: Stroke) => {
    if (!roomCode) return;
    supabase.channel(`whiteboard-room-${roomCode}`).send({
      type: 'broadcast',
      event: 'stroke',
      payload: stroke,
    });
  }, [roomCode]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    if (!roomCode) return;
    supabase.channel(`whiteboard-room-${roomCode}`).send({
      type: 'broadcast',
      event: 'clear',
      payload: {},
    });
  }, [roomCode]);

  const handleLeave = () => {
    setInRoom(false);
    setRoomCode('');
    setStrokes([]);
    setMembers([]);
  };

  if (!inRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
        <h2 className="text-2xl font-bold text-foreground">Private Whiteboard Room</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Create a private room and share the code with friends, or join an existing room.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button onClick={handleCreateRoom} className="flex-1 gap-2" size="lg">
            <Plus className="w-5 h-5" /> Create Room
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full max-w-md">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-2 w-full max-w-md">
          <Input
            placeholder="Enter room code..."
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono text-center tracking-widest text-lg"
            onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
          />
          <Button onClick={handleJoinRoom} className="gap-2">
            <LogIn className="w-4 h-4" /> Join
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Room header */}
      <div className="bg-muted/20 border-b border-border/30 px-4 py-2 flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-xs text-destructive">No NSFW or offensive content</span>
        <div className="h-4 w-px bg-border/50" />
        <span className="text-xs text-muted-foreground">Room:</span>
        <code className="text-sm font-mono font-bold text-primary tracking-widest">{roomCode}</code>
        <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-7 px-2">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </Button>
        <div className="h-4 w-px bg-border/50" />
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{members.length}</span>
        {members.map(m => (
          <span key={m.id} className="text-xs text-foreground">{m.username}</span>
        ))}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleLeave}>Leave</Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <WhiteboardCanvas
          strokes={strokes}
          onStroke={handleStroke}
          onClear={handleClear}
        />
      </div>
    </div>
  );
};
