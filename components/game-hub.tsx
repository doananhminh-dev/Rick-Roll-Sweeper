'use client';

import { useState } from 'react';
import RickRollSweeper from '@/components/rick-roll-sweeper';
import MemeGomoku from '@/components/meme-gomoku';
import RickDinoRun from '@/components/rick-dino-run';

type GameScreen = 'home' | 'sweeper' | 'gomoku' | 'dino';

export default function GameHub() {
  const [screen, setScreen] = useState<GameScreen>('home');

  if (screen === 'sweeper') {
    return <RickRollSweeper onBackHome={() => setScreen('home')} />;
  }

  if (screen === 'gomoku') {
    return <MemeGomoku onBackHome={() => setScreen('home')} />;
  }

  if (screen === 'dino') {
    return <RickDinoRun onBackHome={() => setScreen('home')} />;
  }

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
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            Meme Arcade

          </h1>
          <p className="mt-3 text-white/80">
            
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <button
            onClick={() => setScreen('sweeper')}
            className="group rounded-3xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur transition hover:scale-[1.02] hover:bg-white/15"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/images/rickroll-bg.jpg"
                alt="Rick Roll Sweeper"
                className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
            <h2 className="mt-4 text-2xl font-black text-pink-300">Rick Roll Sweeper</h2>
            <p className="mt-2 text-sm text-white/75">
              Dò mìn nhưng nó là Rick Roll
            </p>
          </button>

          <button
            onClick={() => setScreen('gomoku')}
            className="group rounded-3xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur transition hover:scale-[1.02] hover:bg-white/15"
          >
            <div className="flex h-48 items-center justify-center gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-950">
              <img
                src="/images/player1.png"
                alt="Player 1"
                className="h-20 w-20 rounded-full object-cover ring-4 ring-pink-400/50"
              />
              <span className="text-3xl font-black text-white/70">VS</span>
              <img
                src="/images/player2.png"
                alt="Player 2"
                className="h-20 w-20 rounded-full object-cover ring-4 ring-cyan-400/50"
              />
            </div>
            <h2 className="mt-4 text-2xl font-black text-cyan-300">Caro Diddy vs Epstein 20x20</h2>
            <p className="mt-2 text-sm text-white/75">
              Bàn 20x20, ai được 5 quân liên tiếp trước là thắng.
            </p>
          </button>

          <button
            onClick={() => setScreen('dino')}
            className="group rounded-3xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur transition hover:scale-[1.02] hover:bg-white/15"
          >
            <div className="flex h-48 items-end justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 px-6 py-4">
              <img
                src="/images/speed-runner.png"
                alt="Speed Runner"
                className="h-24 w-24 object-contain"
              />
              <div className="flex gap-2">
                <div className="h-12 w-3 rounded-sm bg-green-700" />
                <div className="h-16 w-3 rounded-sm bg-green-700" />
                <div className="h-10 w-3 rounded-sm bg-green-700" />
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-black text-yellow-300">Speed Runner</h2>
            <p className="mt-2 text-sm text-white/75">
              Nhảy né xương rồng kiểu Google Dino, nhưng bạn là Speed.
            </p>
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-3 right-4 z-[10001] text-xs font-medium tracking-wide text-white/35 sm:bottom-4 sm:right-5 sm:text-sm">
        Dev: Anh Minh
      </div>
    </div>
  );
}