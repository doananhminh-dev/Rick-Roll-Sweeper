interface ScoreBarProps {
  score: number;
  bestScore: number;
}

export default function ScoreBar({ score, bestScore }: ScoreBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8 bg-card rounded-xl p-6 border-2 border-primary shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Current Score</p>
          <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500">
            {score}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Safe Squares</p>
          <p className="text-2xl font-semibold text-purple-500">68</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Best Score</p>
          <p className="text-2xl font-semibold text-cyan-400">{bestScore}</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden border border-primary/30">
        <div
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
          style={{ width: `${(score / 68) * 100}%` }}
        />
      </div>
    </div>
  );
}
