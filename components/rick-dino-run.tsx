'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  onBackHome: () => void;
};

type Obstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
};

const GAME_WIDTH = 900;
const GAME_HEIGHT = 280;
const GROUND_HEIGHT = 58;

const PLAYER_X = 80;
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;

const GRAVITY = 1;
const JUMP_POWER = 20;
const BASE_SPEED = 7;
const MAX_SPEED = 13;
const TICK_MS = 16;

const RUNNER_IMAGE_URL = '/images/speed-runner.png';
const LOSE_IMAGE_URL = '/images/lose.png';
const BEST_SCORE_KEY = 'speed-runner-best-score';
const SCORE_SOUND_URL = '/sounds/dino-score.mp3';
const DEATH_SOUND_URL = '/sounds/sound2.mp3';
const LOSE_TEXT = "Nah bro, you're cooked.";
const MIN_OBSTACLE_GAP = 200;

export default function RickDinoRun({ onBackHome }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreAudioRef = useRef<HTMLAudioElement | null>(null);
  const deathAudioRef = useRef<HTMLAudioElement | null>(null);

  const velocityYRef = useRef(0);
  const obstacleIdRef = useRef(1);
  const spawnElapsedRef = useRef(0);
  const lastScoreSoundRef = useRef(0);
  const isRunningRef = useRef(false);
  const scoreRef = useRef(0);
  const playerYRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    setBestScore(saved ? Number(saved) : 0);
  }, []);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    playerYRef.current = playerY;
  }, [playerY]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }

      if (e.code === 'Enter' && !isRunningRef.current) {
        startGame();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setPlayerY((prevY) => {
        let nextVelocity = velocityYRef.current - GRAVITY;
        let nextY = prevY + nextVelocity;

        if (nextY <= 0) {
          nextY = 0;
          nextVelocity = 0;
        }

        velocityYRef.current = nextVelocity;
        return nextY;
      });

      setObstacles((prev) => {
        const speed = Math.min(MAX_SPEED, BASE_SPEED + scoreRef.current / 220);

        const moved = prev
          .map((obs) => ({ ...obs, x: obs.x - speed }))
          .filter((obs) => obs.x + obs.width > 0);

        spawnElapsedRef.current += TICK_MS;
        const spawnDelay = Math.max(750, 1250 - scoreRef.current * 0.8);

        if (spawnElapsedRef.current >= spawnDelay) {
          const lastObstacle = moved[moved.length - 1];
          const spawnX = GAME_WIDTH + Math.random() * 40;

          const canSpawn =
            !lastObstacle || spawnX - (lastObstacle.x + lastObstacle.width) >= MIN_OBSTACLE_GAP;

          if (canSpawn) {
            moved.push({
              id: obstacleIdRef.current++,
              x: spawnX,
              width: 22 + Math.random() * 10,
              height: 36 + Math.random() * 28,
            });

            spawnElapsedRef.current = 0;
          }
        }

        return moved;
      });

      setScore((prev) => prev + 1);
    }, TICK_MS);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const playerLeft = PLAYER_X + 8;
    const playerRight = PLAYER_X + PLAYER_WIDTH - 8;

    const playerBottom = GROUND_HEIGHT + playerY;
    const playerTop = playerBottom + PLAYER_HEIGHT - 8;

    for (const obstacle of obstacles) {
      const obstacleLeft = obstacle.x;
      const obstacleRight = obstacle.x + obstacle.width;
      const obstacleBottom = GROUND_HEIGHT;
      const obstacleTop = obstacleBottom + obstacle.height;

      const hit =
        playerRight > obstacleLeft &&
        playerLeft < obstacleRight &&
        playerTop > obstacleBottom &&
        playerBottom < obstacleTop;

      if (hit) {
        loseGame();
        break;
      }
    }
  }, [obstacles, playerY, isRunning]);

  useEffect(() => {
    if (score > 0 && score % 100 === 0 && score !== lastScoreSoundRef.current) {
      lastScoreSoundRef.current = score;
      if (scoreAudioRef.current) {
        scoreAudioRef.current.currentTime = 0;
        scoreAudioRef.current.play().catch(() => {});
      }
    }
  }, [score]);

  function stopAllSounds() {
    if (scoreAudioRef.current) {
      scoreAudioRef.current.pause();
      scoreAudioRef.current.currentTime = 0;
    }
    if (deathAudioRef.current) {
      deathAudioRef.current.pause();
      deathAudioRef.current.currentTime = 0;
    }
  }

  function startGame() {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    stopAllSounds();

    setIsGameOver(false);
    setIsRunning(true);
    setScore(0);
    setPlayerY(0);
    setObstacles([]);

    velocityYRef.current = 0;
    spawnElapsedRef.current = 0;
    lastScoreSoundRef.current = 0;
    scoreRef.current = 0;
    playerYRef.current = 0;
    obstacleIdRef.current = 1;
  }

  function handleJump() {
    if (!isRunningRef.current) {
      startGame();
      return;
    }

    if (playerYRef.current <= 1) {
      velocityYRef.current = JUMP_POWER;
    }
  }

  function loseGame() {
    setIsRunning(false);
    setIsGameOver(true);

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    if (deathAudioRef.current) {
      deathAudioRef.current.currentTime = 0;
      deathAudioRef.current.play().catch(() => {});
    }

    const nextBest = Math.max(scoreRef.current, bestScore);
    setBestScore(nextBest);
    localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
  }

  function handleBackHome() {
    stopAllSounds();
    onBackHome();
  }

  const gameAreaStyle: CSSProperties = {
    width: '100%',
    maxWidth: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
  };

  const runnerStyle: CSSProperties = {
    left: `${PLAYER_X}px`,
    width: `${PLAYER_WIDTH}px`,
    height: `${PLAYER_HEIGHT}px`,
    bottom: `${GROUND_HEIGHT + playerY}px`,
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-orange-100 text-slate-900">
      <audio ref={scoreAudioRef} src={SCORE_SOUND_URL} preload="auto" />
      <audio ref={deathAudioRef} src={DEATH_SOUND_URL} preload="auto" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-black/10 px-4 py-2 font-semibold">
              Score: <span className="text-pink-600">{score}</span>
            </div>
            <div className="rounded-xl bg-black/10 px-4 py-2 font-semibold">
              Best: <span className="text-yellow-600">{bestScore}</span>
            </div>
            <div className="rounded-xl bg-black/10 px-4 py-2 font-semibold">
              Controls: <span className="text-cyan-700">Space / ArrowUp</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBackHome}
              className="rounded-xl bg-pink-500 px-4 py-2 font-semibold text-white transition hover:bg-pink-600"
            >
              Home
            </button>
          </div>
        </div>

        <div className="mb-4 text-center text-sm text-slate-700">
          Nhấn <b>Space</b> hoặc <b>Arrow Up</b> để nhảy
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[960px] overflow-hidden rounded-3xl border border-black/10 bg-white/60 p-4 shadow-2xl backdrop-blur">
            <div
              className="relative mx-auto overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-b from-sky-200 to-orange-50"
              style={gameAreaStyle}
            >
              <div
                className="absolute inset-x-0 border-t-4 border-dashed border-slate-400/50"
                style={{ bottom: `${GROUND_HEIGHT}px` }}
              />

              <div
                className="absolute left-0 right-0 bottom-0 bg-orange-200/80"
                style={{ height: `${GROUND_HEIGHT}px` }}
              />

              <img
                src={RUNNER_IMAGE_URL}
                alt="Speed Runner"
                className="absolute object-contain"
                style={runnerStyle}
              />

              {obstacles.map((obstacle) => (
                <div
                  key={obstacle.id}
                  className="absolute rounded-sm bg-green-700"
                  style={{
                    left: `${obstacle.x}px`,
                    width: `${obstacle.width}px`,
                    height: `${obstacle.height}px`,
                    bottom: `${GROUND_HEIGHT}px`,
                  }}
                >
                  <div className="absolute -left-1 top-2 h-3 w-2 rounded bg-green-700" />
                  <div className="absolute -right-1 top-4 h-3 w-2 rounded bg-green-700" />
                </div>
              ))}

              {!isRunning && !isGameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 text-center">
                  <div className="rounded-2xl bg-white/85 px-6 py-4 shadow-lg">
                    <h2 className="text-2xl font-black text-slate-900">Speed Runner</h2>
                    <p className="mt-2 text-slate-700">Nhấn Space để bắt đầu</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isGameOver && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h2 className="text-3xl font-black text-red-600">{LOSE_TEXT}</h2>

            <div className="mt-5 overflow-hidden rounded-2xl">
              <img
                src={LOSE_IMAGE_URL}
                alt="Lose"
                className="mx-auto max-h-[320px] w-full object-contain"
              />
            </div>

            <div className="mt-5 space-y-2 text-slate-700">
              <p>
                Final Score: <span className="font-bold text-pink-600">{score}</span>
              </p>
              <p>
                Best Score: <span className="font-bold text-yellow-600">{bestScore}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startGame}
                className="flex-1 rounded-xl bg-pink-500 px-5 py-3 font-bold text-white transition hover:bg-pink-600"
              >
                Play Again
              </button>
              <button
                onClick={handleBackHome}
                className="flex-1 rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-300"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-3 right-4 z-[10001] text-xs font-medium tracking-wide text-black/35 sm:bottom-4 sm:right-5 sm:text-sm">
        Dev: Anh Minh
      </div>
    </div>
  );
}