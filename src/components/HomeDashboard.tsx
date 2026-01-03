import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Bell, Gamepad2, Timer, Shield, User, TrendingUp, Calendar, Zap, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HomeDashboardProps {
  typewriterText: string;
  onNavigate: (section: string) => void;
}

interface UserStats {
  totalTime: number;
  gamesPlayed: number;
  sessionsCount: number;
  lastVisit: string | null;
  streak: number;
}

const STATS_KEY = 'solarnova_user_stats';
const GAMES_HISTORY_KEY = 'solarnova_games_history';

export const HomeDashboard = ({ typewriterText, onNavigate }: HomeDashboardProps) => {
  const { user, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadMessage, setUnreadMessage] = useState<{ from: string; message: string } | null>(null);
  const [recentGames, setRecentGames] = useState<{ thumbnail: string; title: string; id: string }[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionStart] = useState(Date.now());
  const [userStats, setUserStats] = useState<UserStats>({
    totalTime: 0,
    gamesPlayed: 0,
    sessionsCount: 1,
    lastVisit: null,
    streak: 1
  });

  // Load and update persistent stats
  useEffect(() => {
    if (!user) return;
    
    const statsKey = `${STATS_KEY}_${user.id}`;
    const savedStats = localStorage.getItem(statsKey);
    const today = new Date().toDateString();
    
    if (savedStats) {
      const parsed: UserStats = JSON.parse(savedStats);
      const lastVisitDate = parsed.lastVisit ? new Date(parsed.lastVisit).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let newStreak = parsed.streak;
      if (lastVisitDate === yesterday) {
        newStreak = parsed.streak + 1;
      } else if (lastVisitDate !== today) {
        newStreak = 1;
      }
      
      const updatedStats = {
        ...parsed,
        sessionsCount: lastVisitDate === today ? parsed.sessionsCount : parsed.sessionsCount + 1,
        lastVisit: today,
        streak: newStreak
      };
      
      setUserStats(updatedStats);
      localStorage.setItem(statsKey, JSON.stringify(updatedStats));
    } else {
      const newStats = {
        totalTime: 0,
        gamesPlayed: 0,
        sessionsCount: 1,
        lastVisit: today,
        streak: 1
      };
      setUserStats(newStats);
      localStorage.setItem(statsKey, JSON.stringify(newStats));
    }
  }, [user]);

  // Save session time periodically
  useEffect(() => {
    if (!user) return;
    
    const statsKey = `${STATS_KEY}_${user.id}`;
    const interval = setInterval(() => {
      const currentSession = Math.floor((Date.now() - sessionStart) / 1000);
      const savedStats = localStorage.getItem(statsKey);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        const updated = {
          ...parsed,
          totalTime: parsed.totalTime + 10 // Add 10 seconds every interval
        };
        localStorage.setItem(statsKey, JSON.stringify(updated));
        setUserStats(updated);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [user, sessionStart]);

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

  // Get recent games from localStorage
  useEffect(() => {
    if (!user) return;
    const historyKey = `${GAMES_HISTORY_KEY}_${user.id}`;
    const history = localStorage.getItem(historyKey);
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setRecentGames(parsed.slice(0, 3));
      } catch {
        // Invalid JSON
      }
    }
  }, [user]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatSessionTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const glassStyle = {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Typewriter Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center text-gradient">
        {typewriterText}
        <span className="animate-pulse text-primary">|</span>
      </h1>

      {/* Unified Dashboard Panel */}
      <div 
        className="rounded-3xl p-6 md:p-8"
        style={glassStyle}
      >
        {/* Header Row - Welcome & Clock */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-primary/10">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(234, 179, 8, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)'
              }}
            >
              {isAdmin ? (
                <Shield className="w-7 h-7 text-yellow-400" />
              ) : (
                <User className="w-7 h-7 text-primary" />
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Welcome back,</p>
              <p className="text-2xl font-bold text-foreground">{user?.username}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground font-mono tracking-tight">
                {formatTime(currentTime)}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {/* Current Session */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">This Session</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatSessionTime(sessionTime)}</p>
          </div>

          {/* Total Time */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Total Time</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatDuration(userStats.totalTime)}</p>
          </div>

          {/* Games Played */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Games Played</span>
            </div>
            <p className="text-xl font-bold text-foreground">{userStats.gamesPlayed}</p>
          </div>

          {/* Streak */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-muted-foreground">Day Streak</span>
            </div>
            <p className="text-xl font-bold text-foreground">{userStats.streak} 🔥</p>
          </div>
        </div>

        {/* Main Content Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Recent Games */}
          <button
            onClick={() => onNavigate('games')}
            className="md:col-span-2 rounded-2xl p-4 bg-primary/5 border border-primary/10 text-left transition-all duration-300 hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Recent Games</span>
              </div>
              <span className="text-xs text-muted-foreground">Click to play →</span>
            </div>
            <div className="flex gap-3">
              {recentGames.length > 0 ? (
                recentGames.map((game, i) => (
                  <div 
                    key={game.id || i} 
                    className="w-20 h-20 rounded-xl overflow-hidden bg-muted/50 flex-shrink-0"
                  >
                    <img 
                      src={game.thumbnail} 
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              ) : (
                <>
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className="w-20 h-20 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0"
                    >
                      <Gamepad2 className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  ))}
                </>
              )}
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  {recentGames.length === 0 ? 'No games played yet' : `${userStats.gamesPlayed} total`}
                </span>
              </div>
            </div>
          </button>

          {/* Announcements */}
          <button
            onClick={() => onNavigate('announcements')}
            className="rounded-2xl p-4 bg-primary/5 border border-primary/10 text-left transition-all duration-300 hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${unreadAnnouncements > 0 ? 'bg-pink-500/20' : 'bg-primary/20'}`}>
                <Bell className={`w-5 h-5 ${unreadAnnouncements > 0 ? 'text-pink-400' : 'text-primary'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Announcements</p>
                <p className="text-xs text-muted-foreground">
                  {unreadAnnouncements > 0 ? `${unreadAnnouncements} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {unreadAnnouncements > 0 && (
              <div className="flex items-center justify-center py-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <span className="text-3xl font-bold text-pink-400">{unreadAnnouncements}</span>
              </div>
            )}
          </button>
        </div>

        {/* Messages & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unread Message */}
          <button
            onClick={() => onNavigate('chatroom')}
            className="rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: unreadMessage 
                ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)'
                : 'rgba(139, 92, 246, 0.05)',
              border: unreadMessage 
                ? '1px solid rgba(236, 72, 153, 0.2)'
                : '1px solid rgba(139, 92, 246, 0.1)'
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${unreadMessage ? 'bg-pink-500/20' : 'bg-primary/20'}`}>
                <MessageSquare className={`w-5 h-5 ${unreadMessage ? 'text-pink-400' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground mb-1">Messages</p>
                {unreadMessage ? (
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="text-xs text-pink-400 font-medium mb-1">From {unreadMessage.from}</p>
                    <p className="text-sm text-foreground/80">{unreadMessage.message}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No unread messages</p>
                )}
              </div>
            </div>
          </button>

          {/* Session Info */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Activity</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-background/30">
                <p className="text-2xl font-bold text-foreground">{userStats.sessionsCount}</p>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/30">
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(userStats.totalTime / Math.max(userStats.sessionsCount, 1) / 60)}m
                </p>
                <p className="text-xs text-muted-foreground">Avg. Session</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        <span className="hidden md:inline">Press <kbd className="px-2 py-1 bg-muted rounded text-foreground">R</kbd> to panic exit • Hover left to show menu</span>
        <span className="md:hidden">Tap bottom menu to navigate</span>
      </p>
    </div>
  );
};
