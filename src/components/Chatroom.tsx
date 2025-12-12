import { useState, useRef } from 'react';
import { Send, Lock, Users, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
}

export function Chatroom() {
  const [step, setStep] = useState<'join' | 'chat'>('join');
  const [chatroomName, setChatroomName] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleJoinChatroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!chatroomName || !password || !username) {
      setError('Please fill in all fields');
      return;
    }

    // For demo purposes, just move to chat step
    // Full functionality requires Supabase connection
    setStep('chat');
    
    // Add welcome message
    setMessages([
      {
        id: '1',
        username: 'System',
        content: `Welcome to ${chatroomName}! Connect Supabase for real-time encrypted messaging.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      username,
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage('');

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (step === 'join') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-card border border-border/30 rounded-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground text-center mb-2">Join Chatroom</h2>
          <p className="text-muted-foreground text-center mb-6">
            Secure encrypted messaging
          </p>

          <form onSubmit={handleJoinChatroom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Chatroom Name
              </label>
              <input
                type="text"
                value={chatroomName}
                onChange={(e) => setChatroomName(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter chatroom name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background/50 border border-border/30 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter chatroom password"
              />
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-lg px-4 py-2 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 text-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-glow"
            >
              Join Chatroom
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border/20">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Connect Supabase for real-time messaging</span>
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
                <h3 className="text-xl font-bold text-foreground">{chatroomName}</h3>
                <p className="text-sm text-muted-foreground">Logged in as {username}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setStep('join');
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
                className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.username === username
                      ? 'bg-gradient-primary'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-xs text-foreground/70 mb-1">{msg.username}</p>
                  <p className="text-foreground break-words">{msg.content}</p>
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
            />
            <button
              type="submit"
              className="bg-gradient-primary hover:opacity-90 p-3 rounded-lg transition-all duration-300 shadow-glow"
            >
              <Send className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
