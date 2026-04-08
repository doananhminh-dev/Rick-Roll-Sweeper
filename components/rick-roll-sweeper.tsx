'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Tile = {
  id: number;
  row: number;
  col: number;
  isRickRoll: boolean; // mine
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentCount: number;
};

type Props = {
  onBackHome: () => void;
};

const GRID_SIZE = 20;
const RICKROLL_COUNT = 150;

const BEST_SCORE_KEY = 'rickroll-sweeper-best-score';
const RICKROLL_VIDEO_URL = '/videos/rickroll.mp4';
const LOSE_TEXT = 'Bạn đã bị rick roll rồi 😂';

function createEmptyGrid(): Tile[][] {
  let id = 0;
  const grid: Tile[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Tile[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({
        id: id++,
        row: r,
        col: c,
        isRickRoll: false,
        isRevealed: false,
        isFlagged: false,
        adjacentCount: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((t) => ({ ...t })));
}

function getNeighbors(row: number, col: number) {
  const res: Array<{ row: number; col: number }> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        res.push({ row: nr, col: nc });
      }
    }
  }
  return res;
}

function idxOf(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomSafeBlob(clickedRow: number, clickedCol: number) {
  // Safe “blob” ngẫu nhiên nhưng luôn bao gồm ô đầu + 8 ô kề
  const safe = new Set<number>();

  const base = [{ row: clickedRow, col: clickedCol }, ...getNeighbors(clickedRow, clickedCol)];
  for (const p of base) safe.add(idxOf(p.row, p.col));

  const targetSize = 10 + Math.floor(Math.random() * 8); // ~10..17 cell trong vùng an toàn
  const frontier = [...base];

  // BFS/Random expansion để blob méo ngẫu nhiên
  while (safe.size < targetSize && frontier.length > 0) {
    const cur = frontier[Math.floor(Math.random() * frontier.length)];
    const neigh = getNeighbors(cur.row, cur.col);
    shuffleInPlace(neigh);

    for (const nb of neigh) {
      const k = idxOf(nb.row, nb.col);
      if (safe.has(k)) continue;

      // thêm xác suất để blob “méo” tự nhiên
      const chance = 0.45 + Math.random() * 0.35;
      if (Math.random() < chance) {
        safe.add(k);
        frontier.push(nb);
        if (safe.size >= targetSize) break;
      }
    }
  }

  return safe;
}

function computeAdjacentCounts(grid: Tile[][]) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.isRickRoll) continue;

      let count = 0;
      for (const nb of getNeighbors(r, c)) {
        if (grid[nb.row][nb.col].isRickRoll) count++;
      }
      tile.adjacentCount = count;
    }
  }
}

function revealFlood(gridInput: Tile[][], startRow: number, startCol: number) {
  const grid = cloneGrid(gridInput);

  const q: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  const visited = new Set<number>();
  let revealedCount = 0;

  while (q.length > 0) {
    const cur = q.pop()!;
    const key = idxOf(cur.row, cur.col);
    if (visited.has(key)) continue;
    visited.add(key);

    const tile = grid[cur.row][cur.col];
    if (!tile) continue;
    if (tile.isRevealed || tile.isFlagged) continue;
    if (tile.isRickRoll) continue;

    tile.isRevealed = true;
    revealedCount++;

    // Minesweeper: chỉ lan khi ô = 0
    if (tile.adjacentCount === 0) {
      for (const nb of getNeighbors(cur.row, cur.col)) {
        const nbTile = grid[nb.row][nb.col];
        if (!nbTile) continue;
        if (nbTile.isRevealed || nbTile.isFlagged) continue;
        if (nbTile.isRickRoll) continue;
        q.push({ row: nb.row, col: nb.col });
      }
    }
  }

  return { newGrid: grid, revealedCount };
}

function revealAllMines(gridInput: Tile[][]) {
  const grid = cloneGrid(gridInput);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].isRickRoll) grid[r][c].isRevealed = true;
    }
  }
  return grid;
}

function getNumberColor(count: number) {
  switch (count) {
    case 1:
      return 'text-blue-600';
    case 2:
      return 'text-green-600';
    case 3:
      return 'text-red-600';
    case 4:
      return 'text-indigo-700';
    case 5:
      return 'text-yellow-600';
    case 6:
      return 'text-pink-600';
    case 7:
      return 'text-cyan-700';
    case 8:
      return 'text-slate-700';
    default:
      return 'text-slate-700';
  }
}

export default function RickRollSweeper({ onBackHome }: Props) {
  const [screen, setScreen] = useState<'home' | 'game'>('home');

  const [grid, setGrid] = useState<Tile[][]>(() => createEmptyGrid());
  const [minesPlaced, setMinesPlaced] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [videoNeedsUserStart, setVideoNeedsUserStart] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    setBestScore(saved ? Number(saved) : 0);
  }, []);

  const safeTilesCount = GRID_SIZE * GRID_SIZE - RICKROLL_COUNT;

  const totalRevealedSafe = useMemo(() => {
    return grid.flat().filter((t) => t.isRevealed && !t.isRickRoll).length;
  }, [grid]);

  const totalFlags = useMemo(() => {
    return grid.flat().filter((t) => t.isFlagged).length;
  }, [grid]);

  function stopVideo() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  function startNewGame() {
    stopVideo();
    setGrid(createEmptyGrid());
    setMinesPlaced(false);

    setScore(0);
    setGameOver(false);
    setWon(false);

    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setVideoNeedsUserStart(false);
  }

  function updateBestScore(finalScore: number) {
    const nextBest = Math.max(finalScore, bestScore);
    setBestScore(nextBest);
    localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
  }

  function tryPlayVideoWithSound() {
    const v = videoRef.current;
    if (!v) return;

    v.currentTime = 0;
    v.muted = false;
    v.volume = 1;

    const p = v.play();
    if (p) {
      p.then(() => setVideoNeedsUserStart(false)).catch(() => {
        v.muted = true;
        setVideoNeedsUserStart(true);
      });
    } else {
      setVideoNeedsUserStart(true);
    }
  }

  function handleLose(finalScore: number) {
    setGameOver(true);
    setWon(false);
    updateBestScore(finalScore);

    setGrid((prev) => revealAllMines(prev));

    setShowVideoOverlay(true);
    setShowGameOverModal(false);

    setTimeout(() => {
      // autoplay có tiếng có thể bị chặn; ta có fallback button
      tryPlayVideoWithSound();
    }, 150);
  }

  function closeVideoOverlay() {
    stopVideo();
    setShowVideoOverlay(false);
    setShowGameOverModal(true);
    setVideoNeedsUserStart(false);
  }

  function handleVideoEnded() {
    closeVideoOverlay();
  }

  function handleBackHomeClean() {
    stopVideo();
    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setVideoNeedsUserStart(false);

    setGameOver(false);
    setWon(false);
    setMinesPlaced(false);

    setScreen('home');
    onBackHome?.();
  }

  function placeMinesAfterFirstClick(clickedRow: number, clickedCol: number) {
    const safeBlob = generateRandomSafeBlob(clickedRow, clickedCol);

    const allowed: number[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const id = idxOf(r, c);
        if (!safeBlob.has(id)) allowed.push(id);
      }
    }

    shuffleInPlace(allowed);

    const mined = cloneGrid(grid);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        mined[r][c].isRickRoll = false;
        mined[r][c].adjacentCount = 0;
        mined[r][c].isRevealed = false;
        // flags trước first click không cho phép -> giữ như cũ
      }
    }

    const chosen = allowed.slice(0, RICKROLL_COUNT);
    for (const id of chosen) {
      const r = Math.floor(id / GRID_SIZE);
      const c = id % GRID_SIZE;
      mined[r][c].isRickRoll = true;
    }

    computeAdjacentCounts(mined);
    return mined;
  }

  function toggleFlag(row: number, col: number) {
    if (!minesPlaced) return;
    if (gameOver || showVideoOverlay || showGameOverModal) return;

    setGrid((prev) => {
      const next = cloneGrid(prev);
      const t = next[row][col];
      if (!t || t.isRevealed) return prev;
      t.isFlagged = !t.isFlagged;
      return next;
    });
  }

  function handleTileClick(row: number, col: number) {
    if (gameOver || showVideoOverlay || showGameOverModal) return;

    const t = grid[row]?.[col];
    if (!t || t.isRevealed || t.isFlagged) return;

    // First click: place mines + safe reveal
    if (!minesPlaced) {
      const mined = placeMinesAfterFirstClick(row, col);
      const { newGrid, revealedCount } = revealFlood(mined, row, col);

      setGrid(newGrid);
      setMinesPlaced(true);

      const nextScore = revealedCount; // score tính từ 0
      setScore(nextScore);

      const winNow = newGrid.flat().filter((x) => x.isRevealed && !x.isRickRoll).length === safeTilesCount;
      if (winNow) {
        setWon(true);
        setGameOver(true);
        updateBestScore(nextScore);
        setShowVideoOverlay(false);
        setShowGameOverModal(true);
      }
      return;
    }

    // Normal: mine or reveal
    if (t.isRickRoll) {
      const nextGrid = cloneGrid(grid);
      nextGrid[row][col].isRevealed = true;
      setGrid(nextGrid);
      handleLose(score);
      return;
    }

    const { newGrid, revealedCount } = revealFlood(grid, row, col);
    if (revealedCount <= 0) return;

    const nextScore = score + revealedCount;
    setGrid(newGrid);
    setScore(nextScore);

    const winNow = newGrid.flat().filter((x) => x.isRevealed && !x.isRickRoll).length === safeTilesCount;
    if (winNow) {
      setWon(true);
      setGameOver(true);
      updateBestScore(nextScore);
      setShowVideoOverlay(false);
      setShowGameOverModal(true);
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-900 to-indigo-950 text-white">
      {screen === 'home' && (
        <div
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
          style={{
            backgroundImage: "url('/images/rickroll-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/15 via-purple-500/15 to-blue-500/15" />

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm backdrop-blur">
              🎵 Meme Mode Activated
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Rick Roll Sweeper</h1>
            <p className="mt-4 max-w-xl text-lg text-white/85 sm:text-xl">
              Dò mìn Rick Roll: bấm lần đầu để game tạo mìn an toàn quanh bạn. Mật độ mìn cao (150).
            </p>

            <button
              onClick={() => {
                setScreen('game');
                startNewGame();
              }}
              className="mt-10 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-12 py-5 text-2xl font-extrabold shadow-2xl transition hover:scale-105 hover:shadow-pink-500/30"
            >
              PLAY
            </button>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
              <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
                Current Score: <span className="text-pink-300">{score}</span>
              </div>
              <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
                Best Score: <span className="text-yellow-300">{bestScore}</span>
              </div>
              <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
                Revealed: <span className="text-cyan-300">{totalRevealedSafe}</span>
              </div>
              <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
                Flags: <span className="text-orange-300">{totalFlags}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startNewGame}
                className="rounded-xl bg-white/15 px-4 py-2 font-semibold transition hover:bg-white/25"
              >
                Restart
              </button>
              <button
                onClick={handleBackHomeClean}
                className="rounded-xl bg-pink-500/80 px-4 py-2 font-semibold transition hover:bg-pink-500"
              >
                Home
              </button>
            </div>
          </div>

          <div className="mb-3 text-center text-xs text-white/70 sm:text-sm">
            Left click reveal • Right click flag 🚩
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-full overflow-auto rounded-3xl border border-white/10 bg-black/20 p-3 shadow-2xl backdrop-blur sm:p-4">
              <div
                className="grid gap-[2px] sm:gap-1"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
              >
                {grid.flat().map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile.row, tile.col)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleFlag(tile.row, tile.col);
                    }}
                    disabled={showVideoOverlay || showGameOverModal}
                    className={[
                      'flex aspect-square h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] font-extrabold transition select-none sm:h-6 sm:w-6 sm:text-xs md:h-7 md:w-7',
                      tile.isRevealed
                        ? tile.isRickRoll
                          ? 'border-red-400 bg-red-500/80 text-white'
                          : 'border-white/10 bg-white/90'
                        : tile.isFlagged
                        ? 'border-orange-300 bg-gradient-to-br from-orange-500 to-red-600 text-white hover:brightness-110'
                        : 'border-white/10 bg-gradient-to-br from-slate-700 to-slate-800 text-white hover:scale-[1.03] hover:from-slate-600 hover:to-slate-700',
                    ].join(' ')}
                  >
                    {tile.isRevealed ? (
                      tile.isRickRoll ? (
                        <span>🎵</span>
                      ) : tile.adjacentCount > 0 ? (
                        <span className={getNumberColor(tile.adjacentCount)}>{tile.adjacentCount}</span>
                      ) : (
                        <span className="text-transparent">0</span>
                      )
                    ) : tile.isFlagged ? (
                      <span>🚩</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVideoOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-black p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                closeVideoOverlay();
              }}
              className="absolute right-3 top-3 z-[10000] rounded-lg bg-white/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/30"
            >
              Close Video
            </button>

            <div className="mb-3 pr-28 text-lg font-extrabold text-pink-300 sm:text-2xl">
              {LOSE_TEXT}
            </div>

            <div className="overflow-hidden rounded-xl">
              <video
                ref={videoRef}
                className="h-auto max-h-[70vh] w-full bg-black"
                src={RICKROLL_VIDEO_URL}
                playsInline
                controls
                preload="auto"
                muted
                onEnded={handleVideoEnded}
              />
            </div>

            {videoNeedsUserStart && (
              <div className="mt-4 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-white/80">
                  Trình duyệt chặn autoplay có tiếng. Bấm để phát âm thanh.
                </p>
                <button
                  onClick={tryPlayVideoWithSound}
                  className="rounded-xl bg-pink-500 px-5 py-3 font-bold text-white transition hover:bg-pink-400"
                >
                  Play with Sound
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showGameOverModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-purple-950 p-6 text-center shadow-2xl">
            <div className="text-3xl font-black text-pink-300">
              {won ? 'You Win! 🎉' : LOSE_TEXT}
            </div>

            <div className="mt-4 space-y-2 text-base text-white/90">
              <p>
                Final Score: <span className="font-bold text-cyan-300">{score}</span>
              </p>
              <p>
                Best Score: <span className="font-bold text-yellow-300">{bestScore}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={startNewGame}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-3 font-bold transition hover:scale-[1.02]"
              >
                Play Again
              </button>
              <button
                onClick={handleBackHomeClean}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/20"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-3 right-4 z-[10001] text-xs font-medium tracking-wide text-white/35 sm:bottom-4 sm:right-5 sm:text-sm">
        Dev: Anh Minh
      </div>
    </div>
  );
}