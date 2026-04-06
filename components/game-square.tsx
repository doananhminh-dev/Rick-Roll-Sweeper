'use client';

import type { Square } from '@/lib/game-logic';

interface GameSquareProps {
  square: Square;
  onClick: () => void;
}

const numberColors = {
  1: 'text-blue-400',
  2: 'text-green-400',
  3: 'text-red-400',
  4: 'text-purple-400',
  5: 'text-red-600',
};

export default function GameSquare({ square, onClick }: GameSquareProps) {
  const getNumberColor = (count: number): string => {
    if (count <= 5) {
      return numberColors[count as keyof typeof numberColors] || 'text-purple-500';
    }
    return 'text-purple-600';
  };

  const displayContent = () => {
    if (!square.isRevealed) return null;
    if (square.isRickRoll) return '🎬';
    if (square.adjacentRickRolls === 0) return '';
    return square.adjacentRickRolls;
  };

  return (
    <button
      onClick={onClick}
      disabled={square.isRevealed}
      className={`
        w-12 h-12 md:w-14 md:h-14 rounded-lg font-bold text-lg md:text-xl
        transition-all duration-200 transform hover:scale-105 active:scale-95
        border-2 font-semibold cursor-pointer disabled:cursor-default
        flex items-center justify-center
        ${
          !square.isRevealed
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-700 hover:from-cyan-500 hover:to-cyan-700 shadow-lg hover:shadow-xl active:from-cyan-600 active:to-cyan-800'
            : square.isRickRoll
              ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-800 text-white'
              : 'bg-gradient-to-br from-slate-400 to-slate-600 border-slate-700 text-slate-900'
        }
      `}
    >
      {square.isRevealed && square.adjacentRickRolls > 0 && (
        <span className={getNumberColor(square.adjacentRickRolls)}>
          {displayContent()}
        </span>
      )}
      {square.isRevealed && square.isRickRoll && displayContent()}
    </button>
  );
}
