import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, SpellCheck, ArrowLeft, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { isContentBlocked } from '@/lib/contentFilter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StudyHelperProps {
  onClose: () => void;
}

export function StudyHelper({ onClose }: StudyHelperProps) {
  const [mode, setMode] = useState<'select' | 'grammar' | 'talk'>('select');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add initial greeting when entering a mode
  useEffect(() => {
    if (mode === 'grammar' || mode === 'talk') {
      setMessages([{
        role: 'assistant',
        content: "Hi, I'm Solar! How can I help you?"
      }]);
    }
  }, [mode]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    
    // Client-side content filter
    const filterResult = isContentBlocked(userMessage);
    if (filterResult.blocked) {
      toast({
        title: "Message blocked",
        description: filterResult.reason || "Please keep the conversation appropriate.",
        variant: "destructive"
      });
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solar-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: userMessage,
            mode: mode === 'grammar' ? 'grammar' : 'talk',
            conversationHistory: messages.slice(-10) // Keep last 10 messages for context
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      if (data.blocked) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response || "I can't help with that. Let's focus on studying!"
        }]);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response 
        }]);
      }
    } catch (error) {
      console.error('Solar AI error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
      setInput(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Hi, I'm Solar! How can I help you?"
    }]);
  };

  if (mode === 'select') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Solar AI</h1>
          <p className="text-muted-foreground">Your AI Study Helper</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
          <button
            onClick={() => setMode('grammar')}
            className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group"
          >
            <SpellCheck className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-foreground mb-1">Grammar Check</h3>
            <p className="text-sm text-muted-foreground">Check and improve your writing</p>
          </button>

          <button
            onClick={() => setMode('talk')}
            className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group"
          >
            <BookOpen className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-foreground mb-1">Talking Mode</h3>
            <p className="text-sm text-muted-foreground">Ask questions about any topic</p>
          </button>
        </div>

        <Button
          variant="ghost"
          onClick={onClose}
          className="mt-8 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMode('select')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Solar</h2>
            <p className="text-xs text-muted-foreground">
              {mode === 'grammar' ? 'Grammar Check Mode' : 'Talking Mode'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearChat}
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'grammar' ? "Paste your text to check..." : "Ask me anything about studying..."}
            className="min-h-[48px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
