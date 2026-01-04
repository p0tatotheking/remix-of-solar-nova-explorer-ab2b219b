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
}

const colorClasses = {
  red: 'bg-red-500 border-red-600',
  blue: 'bg-blue-500 border-blue-600',
  green: 'bg-green-500 border-green-600',
  yellow: 'bg-yellow-400 border-yellow-500 text-black',
  wild: 'bg-gradient-to-br from-red-500 via-blue-500 to-green-500 border-purple-600',
};

const valueDisplay: Record<string, string> = {
  skip: '⊘',
  reverse: '⟲',
  draw2: '+2',
  wild: 'W',
  wild4: '+4',
};

export function UnoCard({ card, onClick, disabled, small, faceDown }: UnoCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-bold text-white shadow-lg',
          small ? 'w-8 h-12 text-xs' : 'w-16 h-24 text-lg'
        )}
      >
        UNO
      </div>
    );
  }

  const displayValue = valueDisplay[card.value] || card.value;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg border-4 flex items-center justify-center font-bold text-white shadow-lg transition-all',
        colorClasses[card.color],
        small ? 'w-8 h-12 text-xs' : 'w-16 h-24 text-2xl',
        !disabled && onClick && 'hover:scale-110 hover:-translate-y-2 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="drop-shadow-md">{displayValue}</span>
    </button>
  );
}
