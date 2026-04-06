import GameSquare from './game-square';
import type { Square } from '@/lib/game-logic';

interface GameBoardProps {
  grid: Square[][];
  onSquareClick: (row: number, col: number) => void;
}

export default function GameBoard({ grid, onSquareClick }: GameBoardProps) {
  return (
    <div className="p-4 md:p-6 bg-card rounded-2xl border-3 border-primary shadow-2xl">
      <div className="grid grid-cols-8 gap-2 md:gap-3">
        {grid.map((row, rowIndex) =>
          row.map((square, colIndex) => (
            <GameSquare
              key={`${rowIndex}-${colIndex}`}
              square={square}
              onClick={() => onSquareClick(rowIndex, colIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
}
