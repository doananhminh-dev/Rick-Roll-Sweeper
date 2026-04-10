'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  onBackHome: () => void;
};

type ObstacleType = 'ground' | 'fly';

type Obstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  type: ObstacleType;
  yOffset: number;
};

type TrailPoint = {
  x: number;
  y: number;
  t: number; // timestamp (ms)
};

const GAME_WIDTH = 900;
const GAME_HEIGHT = 280;
const GROUND_HEIGHT = 58;

const PLAYER_X = 80;
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;

const GRAVITY = 1.2;
const JUMP_POWER = 17;

const BASE_SPEED = 7;
const MAX_SPEED = 13;
const TICK_MS = 16;

const RUNNER_IMAGE_URL = '/images/speed-runner.png';
const FLY_IMAGE_URL = '/images/fly.png';
const LOSE_IMAGE_URL = '/images/lose.png';

const BEST_SCORE_KEY = 'speed-runner-best-score';
const SCORE_SOUND_URL = '/sounds/dino-score.mp3';
const DEATH_SOUND_URL = '/sounds/sound2.mp3';

const LOSE_TEXT = "Nah bro, you're cooked.";
const MIN_OBSTACLE_GAP = 155;

const OBSTACLE_FLY_PROB_BASE = 0.18;
const OBSTACLE_FLY_PROB_GROW = 0.30;

const JUMP_ROTATE_STEP = 90;

// ===== trail =====
const TRAIL_LIFE_MS = 500;
const TRAIL_MAX_POINTS = 20;

const TRI_W_NEW = 26;
const TRI_H_NEW = 16;
const TRI_W_OLD = 4;
const TRI_H_OLD = 3;

const TRI_SHIFT_X_PER_INDEX = 4;

const TRI_WAVE_AMP = 4;
const TRI_WAVE_FREQ = 0.85;
const TRI_WAVE_SPEED = 0.015;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function computeJumpTotalSteps(y0: number, v0: number) {
  let y = y0;
  let v = v0;
  let steps = 0;
  for (let i = 0; i < 2000; i++) {
    const nextV = v - GRAVITY;
    const nextY = y + nextV;
    steps++;
    v = nextV;
    y = nextY;
    if (y <= 0) break;
  }
  return Math.max(1, steps);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function RickDinoRun({ onBackHome }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [playerY, setPlayerY] = useState(0);
  const [rotationDeg, setRotationDeg] = useState(0);

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scoreAudioRef = useRef<HTMLAudioElement | null>(null);
  const deathAudioRef = useRef<HTMLAudioElement | null>(null);

  const velocityYRef = useRef(0);
  const playerYRef = useRef(0);
  const scoreRef = useRef(0);

  const obstacleIdRef = useRef(1);
  const spawnElapsedRef = useRef(0);
  const lastScoreSoundRef = useRef(0);

  const isRunningRef = useRef(false);

  // ✅ chống loseGame gọi lặp
  const hasLostRef = useRef(false);

  // rotation animation refs
  const rotationDegRef = useRef(0);
  const rotationAnimatingRef = useRef(false);
  const rotFromRef = useRef(0);
  const rotToRef = useRef(0);
  const jumpStepRef = useRef(0);
  const jumpTotalStepsRef = useRef(1);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const now = performance.now();

      // ===== update player Y =====
      const prevY = playerYRef.current;
      let nextVel = velocityYRef.current - GRAVITY;
      let nextY = prevY + nextVel;

      let landed = false;
      if (nextY <= 0) {
        nextY = 0;
        nextVel = 0;
        landed = true;
      }

      velocityYRef.current = nextVel;
      playerYRef.current = nextY;
      setPlayerY(nextY);

      // ===== rotation animation =====
      if (rotationAnimatingRef.current) {
        if (landed) {
          rotationAnimatingRef.current = false;
          rotationDegRef.current = rotToRef.current;
          setRotationDeg(rotationDegRef.current);
        } else {
          jumpStepRef.current += 1;
          const t = clamp(jumpStepRef.current / jumpTotalStepsRef.current, 0, 1);
          const eased = easeInOutCubic(t);
          const angle = rotFromRef.current + (rotToRef.current - rotFromRef.current) * eased;
          rotationDegRef.current = angle;
          setRotationDeg(angle);
        }
      }

      // ===== trail =====
      setTrail((prev) => {
        const pruned = prev.filter((p) => now - p.t <= TRAIL_LIFE_MS);
        if (nextY <= 0) return pruned;

        const newPoint: TrailPoint = {
          x: PLAYER_X,
          y: GROUND_HEIGHT + nextY + PLAYER_HEIGHT / 2,
          t: now,
        };

        const next = [newPoint, ...pruned];
        return next.slice(0, TRAIL_MAX_POINTS);
      });

      // ===== obstacles update =====
      setObstacles((prev) => {
        const speed = Math.min(MAX_SPEED, BASE_SPEED + scoreRef.current / 220);

        let moved = prev
          .map((obs) => ({ ...obs, x: obs.x - speed }))
          .filter((obs) => obs.x + obs.width > 0);

        spawnElapsedRef.current += TICK_MS;

        const spawnDelay = Math.max(480, 1180 - scoreRef.current * 0.75);

        if (spawnElapsedRef.current >= spawnDelay) {
          const lastObstacle = moved[moved.length - 1];

          const diff = clamp(scoreRef.current / 3500, 0, 1);
          const flyProb = OBSTACLE_FLY_PROB_BASE + diff * OBSTACLE_FLY_PROB_GROW;

          let spawned = false;

          for (let attempt = 0; attempt < 6 && !spawned; attempt++) {
            const spawnX = GAME_WIDTH + Math.random() * 40;

            const canSpawn =
              !lastObstacle || spawnX - (lastObstacle.x + lastObstacle.width) >= MIN_OBSTACLE_GAP;

            if (!canSpawn) continue;

            const isFly = Math.random() < flyProb;

            if (!isFly) {
              moved.push({
                id: obstacleIdRef.current++,
                x: spawnX,
                width: 22 + Math.random() * 10,
                height: 36 + Math.random() * 28,
                type: 'ground',
                yOffset: 0,
              });
            } else {
              moved.push({
                id: obstacleIdRef.current++,
                x: spawnX,
                width: 44 + Math.random() * 14,
                height: 34 + Math.random() * 18,
                type: 'fly',
                yOffset: 55 + Math.random() * 90,
              });
            }

            spawnElapsedRef.current = 0;
            spawned = true;
          }
        }

        if (moved.length > 22) moved = moved.slice(moved.length - 22);

        return moved;
      });

      setScore((s) => s + 1);
    }, TICK_MS);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [isRunning]);

  // collision
  useEffect(() => {
    if (!isRunning) return;

    const playerLeft = PLAYER_X + 8;
    const playerRight = PLAYER_X + PLAYER_WIDTH - 8;

    const playerBottom = GROUND_HEIGHT + playerY;
    const playerTop = playerBottom + PLAYER_HEIGHT - 8;

    for (const obstacle of obstacles) {
      const obstacleLeft = obstacle.x;
      const obstacleRight = obstacle.x + obstacle.width;

      const obstacleBottom = GROUND_HEIGHT + obstacle.yOffset;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obstacles, playerY, isRunning]);

  // score sound (✅ try/catch + reset currentTime)
  useEffect(() => {
    if (score <= 0) return;
    if (score % 100 !== 0) return;
    if (score === lastScoreSoundRef.current) return;

    lastScoreSoundRef.current = score;

    const el = scoreAudioRef.current;
    if (!el) return;

    try {
      el.pause();
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof (p as Promise<void>).catch === 'function') {
        (p as Promise<void>).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [score]);

  function stopAllSounds() {
    const a = scoreAudioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    const d = deathAudioRef.current;
    if (d) {
      d.pause();
      d.currentTime = 0;
    }
  }

  function startGame() {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    hasLostRef.current = false;

    stopAllSounds();

    setIsGameOver(false);
    setIsRunning(true);

    setScore(0);
    setPlayerY(0);
    setObstacles([]);
    setTrail([]);

    velocityYRef.current = 0;
    playerYRef.current = 0;

    spawnElapsedRef.current = 0;
    lastScoreSoundRef.current = 0;
    scoreRef.current = 0;

    obstacleIdRef.current = 1;

    rotationDegRef.current = 0;
    setRotationDeg(0);

    rotationAnimatingRef.current = false;
    rotFromRef.current = 0;
    rotToRef.current = 0;
    jumpStepRef.current = 0;
    jumpTotalStepsRef.current = 1;
  }

  function handleJump() {
    if (!isRunningRef.current) {
      startGame();
      return;
    }

    if (playerYRef.current <= 1) {
      rotationAnimatingRef.current = true;

      rotFromRef.current = rotationDegRef.current;
      rotToRef.current = rotationDegRef.current + JUMP_ROTATE_STEP;

      jumpStepRef.current = 0;
      jumpTotalStepsRef.current = computeJumpTotalSteps(playerYRef.current, JUMP_POWER);

      setTrail([]); // reset trail per jump
      velocityYRef.current = JUMP_POWER;
    }
  }

  function loseGame() {
    if (hasLostRef.current) return;
    hasLostRef.current = true;

    setIsRunning(false);
    setIsGameOver(true);

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    const d = deathAudioRef.current;
    if (d) {
      try {
        d.pause();
        d.currentTime = 0;
        const p = d.play();
        if (p && typeof (p as Promise<void>).catch === 'function') {
          (p as Promise<void>).catch(() => {});
        }
      } catch {
        // ignore
      }
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
    transform: `rotate(${rotationDeg}deg)`,
    transformOrigin: '50% 50%',
    display: 'block',
    willChange: 'transform',
    position: 'absolute',
    pointerEvents: 'none',
  };

  const trailNow = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const trailRender = useMemo(() => {
    if (trail.length === 0) return null;

    return trail.map((tp, i) => {
      const ageRatio = clamp((trailNow - tp.t) / TRAIL_LIFE_MS, 0, 1);
      if (ageRatio >= 1) return null;

      const triW = lerp(TRI_W_NEW, TRI_W_OLD, ageRatio);
      const triH = lerp(TRI_H_NEW, TRI_H_OLD, ageRatio);

      const opacity = clamp(0.95 * (1 - ageRatio), 0.05, 0.95);

      const hue = (score * 2 + i * 30 + trailNow * 0.02) % 360;
      const c1 = `hsl(${hue} 95% 60%)`;
      const c2 = `hsl(${(hue + 45) % 360} 95% 60%)`;

      const wave =
        Math.sin(i * TRI_WAVE_FREQ + trailNow * TRI_WAVE_SPEED) * TRI_WAVE_AMP * (1 - ageRatio);

      return (
        <div
          key={`${tp.t}-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: `${tp.x - i * TRI_SHIFT_X_PER_INDEX}px`,
            bottom: `${tp.y + wave}px`,
            width: `${triW}px`,
            height: `${triH}px`,
            transform: 'translateX(-50%)',
            opacity,
            background: `linear-gradient(90deg, ${c1}, ${c2})`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            filter: `drop-shadow(0 0 ${6 + i * 0.15}px hsla(${hue} 95% 60% / 0.55))`,
            mixBlendMode: 'screen',
          }}
        />
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, trailNow, score]);

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

          <button
            onClick={handleBackHome}
            className="rounded-xl bg-pink-500 px-4 py-2 font-semibold text-white transition hover:bg-pink-600"
          >
            Home
          </button>
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

              {trailRender}
              <img src={RUNNER_IMAGE_URL} alt="Speed Runner" style={runnerStyle} />

              {obstacles.map((o) =>
                o.type === 'fly' ? (
                  <img
                    key={o.id}
                    src={FLY_IMAGE_URL}
                    alt="Fly"
                    className="absolute object-contain pointer-events-none"
                    style={{
                      left: `${o.x}px`,
                      width: `${o.width}px`,
                      height: `${o.height}px`,
                      bottom: `${GROUND_HEIGHT + o.yOffset}px`,
                      filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.15))',
                    }}
                  />
                ) : (
                  <div
                    key={o.id}
                    className="absolute rounded-sm bg-green-700"
                    style={{
                      left: `${o.x}px`,
                      width: `${o.width}px`,
                      height: `${o.height}px`,
                      bottom: `${GROUND_HEIGHT}px`,
                    }}
                  >
                    <div className="absolute -left-1 top-2 h-3 w-2 rounded bg-green-700" />
                    <div className="absolute -right-1 top-4 h-3 w-2 rounded bg-green-700" />
                  </div>
                )
              )}

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
              <img src={LOSE_IMAGE_URL} alt="Lose" className="mx-auto max-h-[320px] w-full object-contain" />
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
    </div>
  );
}