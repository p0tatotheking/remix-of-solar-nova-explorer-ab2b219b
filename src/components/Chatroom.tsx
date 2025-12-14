import { useState, useRef, useEffect } from 'react';
import { Send, Lock, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hashPassword } from '@/lib/crypto';
import { censorText } from '@/lib/profanityFilter';

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

export function Chatroom() {
  const { user } = useAuth();
  const [step, setStep] = useState<'verify' | 'chat'>('verify');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing messages and subscribe to new ones
  useEffect(() => {
    if (step !== 'chat') return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!user) {
      setError('You must be logged in');
      setIsLoading(false);
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      
      const { data, error } = await supabase.rpc('verify_login', {
        p_username: user.username,
        p_password_hash: passwordHash,
      });

      if (error || !data || data.length === 0) {
        setError('Invalid password');
        setIsLoading(false);
        return;
      }

      setStep('chat');
    } catch (err) {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isLoading || !user) return;

    setIsLoading(true);

    const censoredMessage = censorText(newMessage.trim());
    
    const { error } = await supabase.from('chat_messages').insert({
      username: user.username,
      message: censoredMessage,
    });

    if (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }

    setNewMessage('');
    setIsLoading(false);
  };

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-card border border-border/30 rounded-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground text-center mb-2">Verify Identity</h2>
          <p className="text-muted-foreground text-center mb-6">
            Enter your password to access chat
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Access Chat'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/20">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Re-authentication required for chat</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-card border border-border/30 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-border/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-xl font-bold text-foreground">Global Chat</h3>
                <p className="text-sm text-muted-foreground">Logged in as {user?.username}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setStep('verify');
                setPassword('');
                setMessages([]);
              }}
              className="text-sm text-primary hover:text-secondary transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.username === user?.username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.username === user?.username
                      ? 'bg-gradient-primary'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-xs text-foreground/70 mb-1">{msg.username}</p>
                  <p className="text-foreground break-words">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="border-t border-border/30 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-primary hover:opacity-90 p-3 rounded-lg transition-all duration-300 shadow-glow disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
