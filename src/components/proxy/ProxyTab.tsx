import React from 'react';
import { X, Globe } from 'lucide-react';
import { ProxyTab as ProxyTabType } from '@/contexts/ProxyContext';

interface ProxyTabProps {
  tab: ProxyTabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  canClose: boolean;
}

export function ProxyTab({ tab, isActive, onActivate, onClose, canClose }: ProxyTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={onActivate}
      className={`group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] rounded-t-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-background/80 text-foreground border-t border-l border-r border-border/50'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {/* Favicon or Globe icon */}
      {tab.favicon ? (
        <img 
          src={tab.favicon} 
          alt="" 
          className="w-4 h-4 flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-4 h-4 flex-shrink-0" />
      )}
      
      {/* Tab title */}
      <span className="flex-1 truncate text-sm">
        {tab.isLoading ? 'Loading...' : tab.title}
      </span>
      
      {/* Close button */}
      {canClose && (
        <button
          onClick={handleClose}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 transition-all"
          title="Close tab"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
