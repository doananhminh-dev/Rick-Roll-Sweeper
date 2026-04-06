'use client';

import { Button } from './ui/button';
import type { Square } from '@/lib/game-logic';

interface GameOverModalProps {
  score: number;
  bestScore: number;
  isWin: boolean;
  grid: Square[][];
  onPlayAgain: () => void;
  onBackToHome: () => void;
  showVideo: boolean;
  videoFinished: boolean;
  onVideoFinished: () => void;
}

export default function GameOverModal({
  score,
  bestScore,
  isWin,
  grid,
  onPlayAgain,
  onBackToHome,
  showVideo,
  videoFinished,
  onVideoFinished,
}: GameOverModalProps) {
  // Count Rick Rolls hit (revealed and is Rick Roll)
  let rickRollsHit = 0;
  let totalRickRolls = 0;
  for (let row of grid) {
    for (let square of row) {
      if (square.isRickRoll) {
        totalRickRolls++;
        if (square.isRevealed) {
          rickRollsHit++;
        }
      }
    }
  }

  // If it's a loss and video is showing, display video first
  if (showVideo && !isWin && !videoFinished) {
    return (
      <>
        {/* Dark overlay background */}
        <div className="fixed inset-0 bg-black/95 z-40" />
        
        {/* Video modal - highest z-index */}
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl relative">
            {/* Close button - positioned absolutely above video */}
            <button
              onClick={onVideoFinished}
              className="absolute -top-12 right-0 text-pink-400 hover:text-pink-300 font-semibold px-4 py-2 z-50 cursor-pointer transition-colors"
              style={{ pointerEvents: 'auto' }}
            >
              ✕ Close Video
            </button>
            
            {/* Video container */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border-3 border-pink-500 shadow-2xl">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Rick Roll Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Once video is finished or user wins, show the modal with buttons
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-2xl border-3 border-primary shadow-2xl max-w-md w-full p-8 space-y-6">
        {/* Status Header */}
        <div className="text-center space-y-3">
          {isWin ? (
            <>
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">
                You Won!
              </h2>
              <p className="text-muted-foreground">All safe squares revealed!</p>
            </>
          ) : (
            <>
              <div className="text-6xl">🎬</div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                You got Rick Rolled!
              </h2>
              <p className="text-muted-foreground">You hit a Rick Roll trap!</p>
            </>
          )}
        </div>

        {/* Score Stats */}
        <div className="bg-secondary rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Final Score</span>
            <span className="text-2xl font-bold text-purple-500">{score}/68</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Best Score</span>
            <span className="text-2xl font-bold text-pink-500">{bestScore}/68</span>
          </div>
          {!isWin && (
            <div className="flex items-center justify-between pt-2 border-t border-primary/30">
              <span className="text-muted-foreground">Rick Rolls Hit</span>
              <span className="text-lg font-semibold text-red-500">
                {rickRollsHit}/{totalRickRolls}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
          >
            Play Again
          </Button>
          <Button
            onClick={onBackToHome}
            variant="outline"
            size="lg"
            className="flex-1 border-primary hover:bg-primary/10"
          >
            Back Home
          </Button>
        </div>
      </div>
    </div>
  );
}
