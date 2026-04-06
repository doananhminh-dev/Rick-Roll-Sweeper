import { Button } from './ui/button';

interface HomeScreenProps {
  onStart: () => void;
  bestScore: number;
}

export default function HomeScreen({ onStart, bestScore }: HomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4 relative overflow-hidden">
      {/* Retro background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute top-40 right-10 w-32 h-32 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-10 left-1/2 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="max-w-lg w-full text-center space-y-8 relative z-10">
        {/* Retro 80s Title */}
        <div className="space-y-4">
          <div className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 select-none" style={{ textShadow: '0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(168, 85, 247, 0.3)' }}>
            RICK ROLL
          </div>
          <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 select-none" style={{ textShadow: '0 0 30px rgba(34, 211, 238, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)' }}>
            SWEEPER
          </div>
          <p className="text-xl md:text-2xl text-pink-300 font-semibold tracking-widest mt-4">Minesweeper × Rickroll</p>
          <p className="text-sm text-purple-300">Không thể thoát khỏi Rick Astley</p>
        </div>

        {/* Game Rules Card */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border-2 border-cyan-400/50 shadow-2xl space-y-4 text-left">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">HOW TO PLAY</h2>
          <div className="space-y-2">
            <p className="text-cyan-300 flex items-center gap-2">
              <span className="text-lg">💎</span> Click safe squares to reveal the board
            </p>
            <p className="text-pink-300 flex items-center gap-2">
              <span className="text-lg">🎬</span> 13 Rick Rolls hidden in the 9×9 grid
            </p>
            <p className="text-purple-300 flex items-center gap-2">
              <span className="text-lg">📊</span> Numbers show adjacent Rick Rolls
            </p>
            <p className="text-cyan-300 flex items-center gap-2">
              <span className="text-lg">🏆</span> Reveal all 68 safe squares to win!
            </p>
          </div>
        </div>

        {/* Best Score Display */}
        {bestScore > 0 && (
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl p-4 border-2 border-pink-400/30 backdrop-blur">
            <p className="text-sm text-purple-300 uppercase tracking-widest font-semibold">Personal Best</p>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mt-2">{bestScore}/68</p>
          </div>
        )}

        {/* Play Button */}
        <Button
          onClick={onStart}
          size="lg"
          className="w-full text-xl h-16 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-600 hover:via-purple-600 hover:to-cyan-600 text-white font-black rounded-lg shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 tracking-wider"
        >
          PLAY NOW
        </Button>

        <p className="text-xs text-purple-300/50 uppercase tracking-widest">Press your luck against the internet&apos;s greatest prank</p>
      </div>
    </div>
  );
}
