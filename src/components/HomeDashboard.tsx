import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Bell, Gamepad2, Timer, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HomeDashboardProps {
  typewriterText: string;
  onNavigate: (section: string) => void;
}

export const HomeDashboard = ({ typewriterText, onNavigate }: HomeDashboardProps) => {
  const { user, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessage, setUnreadMessage] = useState<{ from: string; message: string } | null>(null);
  const [recentGame, setRecentGame] = useState<{ thumbnail: string; title: string } | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionStart] = useState(Date.now());

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  // Fetch unread announcements count
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const lastRead = localStorage.getItem(`announcements_last_read_${user?.id}`);
      const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);
      
      const { count } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastReadDate.toISOString());
      
      setUnreadAnnouncements(count || 0);
    };
    
    if (user) fetchAnnouncements();
  }, [user]);

  // Fetch unread DM
  useEffect(() => {
    const fetchUnreadDM = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('direct_messages')
        .select('sender_username, message')
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setUnreadMessage({
          from: data[0].sender_username,
          message: data[0].message.length > 50 
            ? data[0].message.substring(0, 50) + '...' 
            : data[0].message
        });
      }
    };
    
    fetchUnreadDM();
  }, [user]);

  // Get recent game from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentGame');
    if (recent) {
      try {
        setRecentGame(JSON.parse(recent));
      } catch {
        // Invalid JSON
      }
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatSessionTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Typewriter Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-8 text-center text-gradient">
        {typewriterText}
        <span className="animate-pulse text-primary">|</span>
      </h1>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Top Row - Announcements & Clock */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* Announcements Widget */}
          <button
            onClick={() => onNavigate('announcements')}
            className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">{unreadAnnouncements}</p>
                <p className="text-xs text-muted-foreground">Announcements</p>
              </div>
            </div>
          </button>

          {/* Clock Widget */}
          <div 
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{formatTime(currentTime)}</p>
                <p className="text-xs text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column - Recent Game */}
        <button
          onClick={() => onNavigate('games')}
          className="group relative overflow-hidden rounded-2xl aspect-square transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {recentGame?.thumbnail ? (
            <img 
              src={recentGame.thumbnail} 
              alt="Recent game"
              className="w-full h-full object-cover rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Gamepad2 className="w-12 h-12 text-primary/50" />
              <p className="text-sm text-muted-foreground">No recent game</p>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 to-transparent">
            <p className="text-xs text-muted-foreground">Recent Game</p>
          </div>
        </button>

        {/* Right Column - Stacked Widgets */}
        <div className="flex flex-col gap-4">
          {/* Welcome Widget */}
          <div 
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <p className="text-muted-foreground text-sm">Welcome,</p>
            <p className="text-xl font-bold text-foreground truncate">{user?.username}</p>
          </div>

          {/* Unread Message Widget */}
          <button
            onClick={() => onNavigate('chatroom')}
            className="relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: unreadMessage 
                ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: unreadMessage 
                ? '1px solid rgba(236, 72, 153, 0.3)'
                : '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${unreadMessage ? 'bg-pink-500/20' : 'bg-primary/20'}`}>
                <MessageSquare className={`w-4 h-4 ${unreadMessage ? 'text-pink-400' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                {unreadMessage ? (
                  <>
                    <p className="text-xs text-pink-400 font-medium">From {unreadMessage.from}</p>
                    <p className="text-sm text-foreground/80 truncate">{unreadMessage.message}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No unread messages</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Session Time */}
            <div 
              className="relative overflow-hidden rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">{formatSessionTime(sessionTime)}</p>
                  <p className="text-[10px] text-muted-foreground">Session</p>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div 
              className="relative overflow-hidden rounded-xl p-3"
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                backdropFilter: 'blur(20px)',
                border: isAdmin 
                  ? '1px solid rgba(234, 179, 8, 0.3)'
                  : '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-yellow-400" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
                <div>
                  <p className={`text-sm font-bold ${isAdmin ? 'text-yellow-400' : 'text-foreground'}`}>
                    {isAdmin ? 'Admin' : 'User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Role</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-muted-foreground/60 mt-8">
        <span className="hidden md:inline">Press <kbd className="px-2 py-1 bg-muted rounded text-foreground">R</kbd> to panic exit • Hover left to show menu</span>
        <span className="md:hidden">Tap bottom menu to navigate</span>
      </p>
    </div>
  );
};
