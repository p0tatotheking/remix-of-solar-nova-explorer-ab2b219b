import { cn } from '@/lib/utils';

export interface Card {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'wild';
  value: string; // 0-9, skip, reverse, draw2, wild, wild4
}

interface UnoCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
  highlight?: boolean;
}

const colorClasses = {
  red: 'from-red-500 to-red-600 border-red-700 shadow-red-500/30',
  blue: 'from-blue-500 to-blue-600 border-blue-700 shadow-blue-500/30',
  green: 'from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-500/30',
  yellow: 'from-yellow-400 to-amber-500 border-yellow-600 shadow-yellow-500/30 text-black',
  wild: 'from-purple-500 via-pink-500 to-orange-500 border-purple-700 shadow-purple-500/30',
};

const valueDisplay: Record<string, string> = {
  skip: '⊘',
  reverse: '↻',
  draw2: '+2',
  wild: '★',
  wild4: '+4',
};

export function UnoCard({ card, onClick, disabled, small, faceDown, highlight }: UnoCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-xl border-2 border-slate-600 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center font-black text-white shadow-xl relative overflow-hidden',
          small ? 'w-7 h-10 text-[8px]' : 'w-16 h-24 text-sm'
        )}
      >
        {/* Card pattern */}
        <div className="absolute inset-2 rounded-lg border-2 border-slate-500/50 flex items-center justify-center">
          <span className="font-black tracking-tighter" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            UNO
          </span>
        </div>
      </div>
    );
  }

  const displayValue = valueDisplay[card.value] || card.value;
  const isActionCard = ['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(card.value);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl border-3 flex items-center justify-center font-black text-white shadow-xl transition-all duration-200 relative overflow-hidden bg-gradient-to-br',
        colorClasses[card.color],
        small ? 'w-7 h-10 text-xs border-2' : 'w-16 h-24 text-2xl border-3',
        !disabled && onClick && 'hover:scale-110 hover:-translate-y-3 hover:shadow-2xl cursor-pointer hover:z-10',
        disabled && 'opacity-40 cursor-not-allowed grayscale',
        highlight && 'ring-2 ring-white ring-offset-2 ring-offset-background'
      )}
    >
      {/* Inner oval design */}
      <div className={cn(
        'absolute bg-white/90 rounded-[100%] flex items-center justify-center',
        small ? 'w-5 h-7 rotate-12' : 'w-12 h-18 rotate-12',
        card.color === 'wild' && 'bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 to-blue-400'
      )}>
        <span 
          className={cn(
            'font-black drop-shadow-sm',
            small ? 'text-[10px]' : isActionCard ? 'text-xl' : 'text-3xl',
            card.color === 'yellow' || card.color === 'wild' ? 'text-slate-800' : `text-${card.color === 'red' ? 'red' : card.color === 'blue' ? 'blue' : card.color === 'green' ? 'emerald' : 'slate'}-600`
          )}
          style={{ 
            textShadow: card.color === 'wild' ? '0 1px 2px rgba(0,0,0,0.2)' : undefined,
            color: card.color === 'red' ? '#dc2626' : card.color === 'blue' ? '#2563eb' : card.color === 'green' ? '#059669' : card.color === 'yellow' ? '#d97706' : '#7c3aed'
          }}
        >
          {displayValue}
        </span>
      </div>
      
      {/* Corner values */}
      {!small && (
        <>
          <span className="absolute top-1 left-1.5 text-xs font-bold drop-shadow-md">{displayValue}</span>
          <span className="absolute bottom-1 right-1.5 text-xs font-bold drop-shadow-md rotate-180">{displayValue}</span>
        </>
      )}
    </button>
  );
}