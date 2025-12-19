import React, { useRef, useEffect } from 'react';
import { X, MessageCircle, Send } from 'lucide-react';
import { useDMNotification } from '@/contexts/DMNotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DMNotificationBanner() {
  const {
    notification,
    isReplying,
    replyMessage,
    setReplyMessage,
    openReply,
    closeReply,
    sendReply,
    dismissNotification,
  } = useDMNotification();
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isReplying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isReplying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
    if (e.key === 'Escape') {
      if (isReplying) {
        closeReply();
      } else {
        dismissNotification();
      }
    }
  };

  if (!notification) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-2 md:px-4 pt-2 md:pt-4 safe-area-pt">
      <div 
        className="pointer-events-auto w-full max-w-sm md:max-w-md animate-slide-down"
        style={{
          animation: 'slideDown 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards',
        }}
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4">
            {/* Avatar */}
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-semibold text-xs md:text-sm">
                {notification.senderUsername.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm md:text-base">
                  {notification.senderUsername}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  now
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={dismissNotification}
              className="p-1 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Reply Section */}
          {isReplying ? (
            <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply..."
                  className="flex-1 bg-muted/30 border-muted text-sm h-9 md:h-10"
                />
                <Button 
                  size="icon" 
                  onClick={sendReply}
                  disabled={!replyMessage.trim()}
                  className="bg-primary hover:bg-primary/90 h-9 w-9 md:h-10 md:w-10"
                >
                  <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={openReply}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs md:text-sm h-8 md:h-9"
              >
                <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
