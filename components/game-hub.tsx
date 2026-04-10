'use client';

import { useEffect, useRef, useState } from 'react';
import RickRollSweeper from '@/components/rick-roll-sweeper';
import MemeGomoku from '@/components/meme-gomoku';
import RickDinoRun from '@/components/rick-dino-run';

type GameScreen = 'home' | 'sweeper' | 'gomoku' | 'dino';

export default function GameHub() {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [hovered, setHovered] = useState<GameScreen | null>(null);

  // Dev watermark video
  const [devVideoOpen, setDevVideoOpen] = useState(false);
  const devVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!devVideoOpen) return;

    const v = devVideoRef.current;
    if (!v) return;

    // Bật tiếng
    v.muted = false;

    // Play lại từ đầu
    v.currentTime = 0;

    const p = v.play();
    if (p) p.catch(() => {});
  }, [devVideoOpen]);

  if (screen === 'sweeper') return <RickRollSweeper onBackHome={() => setScreen('home')} />;
  if (screen === 'gomoku') return <MemeGomoku onBackHome={() => setScreen('home')} />;
  if (screen === 'dino') return <RickDinoRun onBackHome={() => setScreen('home')} />;

  const cardBase =
    'group rounded-3xl border bg-white/10 p-5 text-left backdrop-blur transition duration-200 transform focus:outline-none focus:ring-2 focus:ring-white/30';

  const hoveredStyle = 'border-white/25 shadow-2xl shadow-pink-500/25 ring-1 ring-white/35 -translate-y-2 scale-[1.09]';
  const normalStyle =
    'border-white/10 hover:bg-white/15 hover:border-white/20 hover:-translate-y-[1px] hover:scale-[1.03]';

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-black text-white"
      style={{
        backgroundImage: "url('/images/rickroll-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
        <div className="text-center">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm backdrop-blur">
            🎮 Meme Arcade
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Meme Arcade</h1>
          <p className="mt-3 text-white/80"></p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <button
            onClick={() => setScreen('sweeper')}
            onMouseEnter={() => setHovered('sweeper')}
            onMouseLeave={() => setHovered(null)}
            className={[cardBase, hovered === 'sweeper' ? hoveredStyle : normalStyle].join(' ')}
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/images/rickroll-bg.jpg"
                alt="Rick Roll Sweeper"
                className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <h2 className="mt-4 text-2xl font-black text-pink-300 transition group-hover:text-pink-200">
              Rick Roll Sweeper
            </h2>
            <p className="mt-2 text-sm text-white/75">Dò mìn nhưng nó là Rick Roll</p>
          </button>

          <button
            onClick={() => setScreen('gomoku')}
            onMouseEnter={() => setHovered('gomoku')}
            onMouseLeave={() => setHovered(null)}
            className={[cardBase, hovered === 'gomoku' ? hoveredStyle : normalStyle].join(' ')}
          >
            <div className="flex h-48 items-center justify-center gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-950">
              <img
                src="/images/player1.png"
                alt="Player 1"
                className="h-20 w-20 rounded-full object-cover ring-4 ring-pink-400/50 transition group-hover:ring-pink-300/70"
              />
              <span className="text-3xl font-black text-white/70">VS</span>
              <img
                src="/images/player2.png"
                alt="Player 2"
                className="h-20 w-20 rounded-full object-cover ring-4 ring-cyan-400/50 transition group-hover:ring-cyan-300/70"
              />
            </div>
            <h2 className="mt-4 text-2xl font-black text-cyan-300 transition group-hover:text-cyan-200">
              Caro Diddy vs Epstein 20x20
            </h2>
            <p className="mt-2 text-sm text-white/75">Bàn 20x20, ai được 5 quân liên tiếp trước là thắng.</p>
          </button>

          <button
            onClick={() => setScreen('dino')}
            onMouseEnter={() => setHovered('dino')}
            onMouseLeave={() => setHovered(null)}
            className={[cardBase, hovered === 'dino' ? hoveredStyle : normalStyle].join(' ')}
          >
            <div className="flex h-48 items-end justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 px-6 py-4">
              <img
                src="/images/speed-runner.png"
                alt="Speed Runner"
                className="h-24 w-24 object-contain transition duration-300 group-hover:scale-105"
              />
              <div className="flex gap-2">
                <div className="h-12 w-3 rounded-sm bg-green-700" />
                <div className="h-16 w-3 rounded-sm bg-green-700" />
                <div className="h-10 w-3 rounded-sm bg-green-700" />
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-black text-yellow-300 transition group-hover:text-yellow-200">
              Speed Runner
            </h2>
            <p className="mt-2 text-sm text-white/75">Nhảy né xương rồng kiểu Google Dino, nhưng bạn là Speed.</p>
          </button>
        </div>
      </div>

      {/* Watermark clickable */}
      <button
        onClick={() => setDevVideoOpen(true)}
        className="fixed bottom-3 right-4 z-[10001] text-xs font-medium tracking-wide text-white/35 sm:bottom-4 sm:right-5 sm:text-sm hover:text-white/70 transition cursor-pointer select-none"
      >
        Dev: Anh Minh
      </button>

      {/* Dev video overlay */}
      {devVideoOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <button
              onClick={() => {
                setDevVideoOpen(false);
                const v = devVideoRef.current;
                if (v) {
                  v.pause();
                  v.currentTime = 0;
                }
              }}
              className="absolute right-3 top-3 z-[2] rounded-lg bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/20"
            >
              Close
            </button>

            <video
              ref={devVideoRef}
              src="/videos/bot1.mp4"
              className="h-auto w-full bg-black"
              autoPlay
              // quan trọng: KHÔNG muted
              // muted removed
              playsInline
              // bật controls để đảm bảo trình duyệt cho nghe tiếng
              controls
              preload="auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}