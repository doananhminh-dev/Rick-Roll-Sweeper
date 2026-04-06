import { Button } from './ui/button';
import GameBoard from './game-board';
import ScoreBar from './score-bar';
import type { Square } from '@/lib/game-logic';

interface GameScreenProps {
  grid: Square[][];
  score: number;
  bestScore: number;
  onSquareClick: (row: number, col: number) => void;
  onRestart: () => void;
  onBackToHome: () => void;
}

export default function GameScreen({
  grid,
  score,
  bestScore,
  onSquareClick,
  onRestart,
  onBackToHome,
}: GameScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary to-accent p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={onBackToHome}
          variant="outline"
          className="border-primary hover:bg-primary/10"
        >
          Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          Rick Roll Sweeper
        </h1>
        <Button
          onClick={onRestart}
          variant="outline"
          className="border-primary hover:bg-primary/10"
        >
          Restart
        </Button>
      </div>

      {/* Score Bar */}
      <ScoreBar score={score} bestScore={bestScore} />

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center">
        <GameBoard grid={grid} onSquareClick={onSquareClick} />
      </div>
    </div>
  );
}
