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
  onBackHome?: () => void;
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

function pickMinesExcludingSafeZone(clickedRow: number, clickedCol: number) {
  // Safe zone = ô đầu + 8 ô kề
  const safeZone = new Set<number>();
  safeZone.add(idxOf(clickedRow, clickedCol));
  for (const nb of getNeighbors(clickedRow, clickedCol)) {
    safeZone.add(idxOf(nb.row, nb.col));
  }

  const allowed: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const id = idxOf(r, c);
      if (!safeZone.has(id)) allowed.push(id);
    }
  }

  // random lấy không lặp
  // shuffle nhanh bằng Fisher-Yates một phần
  const arr = [...allowed];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.slice(0, RICKROLL_COUNT);
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

function revealAreaMinesweeper(gridInput: Tile[][], startRow: number, startCol: number) {
  const grid = cloneGrid(gridInput);

  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  const visited = new Set<number>();
  let revealedCount = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const key = idxOf(cur.row, cur.col);
    if (visited.has(key)) continue;
    visited.add(key);

    const tile = grid[cur.row][cur.col];
    if (!tile) continue;
    if (tile.isRevealed) continue;
    if (tile.isFlagged) continue;
    if (tile.isRickRoll) continue;

    tile.isRevealed = true;
    revealedCount++;

    // Minesweeper flood fill: chỉ lan khi ô có adjacentCount = 0
    if (tile.adjacentCount === 0) {
      for (const nb of getNeighbors(cur.row, cur.col)) {
        const nbTile = grid[nb.row][nb.col];
        if (!nbTile || nbTile.isRevealed || nbTile.isFlagged || nbTile.isRickRoll) continue;
        queue.push({ row: nb.row, col: nb.col });
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
  const [grid, setGrid] = useState<Tile[][]>(() => createEmptyGrid());
  const [minesPlaced, setMinesPlaced] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [videoNeedsUserStart, setVideoNeedsUserStart] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    setBestScore(saved ? Number(saved) : 0);
  }, []);

  const totalRevealedSafe = useMemo(() => {
    return grid.flat().filter((t) => t.isRevealed && !t.isRickRoll).length;
  }, [grid]);

  const totalFlags = useMemo(() => grid.flat().filter((t) => t.isFlagged).length, [grid]);

  const safeTilesCount = GRID_SIZE * GRID_SIZE - RICKROLL_COUNT;

  function stopVideo() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  }

  function startNewGame() {
    stopVideo();
    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setVideoNeedsUserStart(false);

    setGrid(createEmptyGrid());
    setMinesPlaced(false);

    setScore(0);
    setWon(false);
    setGameOver(false);
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
    if (p !== undefined) {
      p.then(() => setVideoNeedsUserStart(false)).catch(() => {
        // nếu autoplay có tiếng bị chặn => cho người dùng bấm nút
        v.muted = true;
        v.play().then(() => setVideoNeedsUserStart(true)).catch(() => setVideoNeedsUserStart(true));
      });
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
      tryPlayVideoWithSound();
    }, 100);
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

    onBackHome?.();
  }

  function toggleFlag(row: number, col: number) {
    if (gameOver) return;
    if (!minesPlaced) return; // y như minesweeper: cho cờ sau khi có mìn
    if (showVideoOverlay || showGameOverModal) return;

    setGrid((prev) => {
      const next = cloneGrid(prev);
      const t = next[row][col];
      if (!t || t.isRevealed) return prev;
      t.isFlagged = !t.isFlagged;
      return next;
    });
  }

  function handleTileClick(row: number, col: number) {
    if (gameOver) return;
    if (showVideoOverlay || showGameOverModal) return;

    const t = grid[row]?.[col];
    if (!t || t.isRevealed || t.isFlagged) return;

    // FIRST CLICK: đặt mìn nhưng đảm bảo ô đầu + 8 ô kề an toàn
    if (!minesPlaced) {
      const minedGrid = cloneGrid(grid);

      const mineIndices = pickMinesExcludingSafeZone(row, col);
      for (const idx of mineIndices) {
        const r = Math.floor(idx / GRID_SIZE);
        const c = idx % GRID_SIZE;
        minedGrid[r][c].isRickRoll = true;
      }

      computeAdjacentCounts(minedGrid);

      // reveal ngay vùng theo flood fill Minesweeper
      const { newGrid, revealedCount } = revealAreaMinesweeper(minedGrid, row, col);

      setGrid(newGrid);
      setMinesPlaced(true);

      setScore(revealedCount);
      setWon(false);

      // win check (rất hiếm)
      const revealedSafe = newGrid.flat().filter((x) => x.isRevealed && !x.isRickRoll).length;
      if (revealedSafe === safeTilesCount) {
        setWon(true);
        setGameOver(true);
        updateBestScore(revealedCount);
        setShowVideoOverlay(false);
        setShowGameOverModal(true);
      }
      return;
    }

    // NORMAL gameplay after mines are placed
    if (t.isRickRoll) {
      const finalGrid = cloneGrid(grid);
      finalGrid[row][col].isRevealed = true;
      setGrid(finalGrid);
      handleLose(score);
      return;
    }

    const { newGrid, revealedCount } = revealAreaMinesweeper(grid, row, col);
    if (revealedCount <= 0) return;

    const nextScore = score + revealedCount;
    setGrid(newGrid);
    setScore(nextScore);

    const revealedSafe = newGrid.flat().filter((x) => x.isRevealed && !x.isRickRoll).length;
    if (revealedSafe === safeTilesCount) {
      setWon(true);
      setGameOver(true);
      updateBestScore(nextScore);
      setShowVideoOverlay(false);
      setShowGameOverModal(true);
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-900 to-indigo-950 text-white">
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
              {grid.flat().map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTileClick(t.row, t.col)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(t.row, t.col);
                  }}
                  disabled={gameOver || showVideoOverlay || showGameOverModal}
                  className={[
                    'flex aspect-square h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] font-extrabold transition select-none sm:h-6 sm:w-6 sm:text-xs md:h-7 md:w-7',
                    t.isRevealed
                      ? t.isRickRoll
                        ? 'border-red-400 bg-red-500/80 text-white'
                        : 'border-white/10 bg-white/90'
                      : t.isFlagged
                        ? 'border-orange-300 bg-gradient-to-br from-orange-500 to-red-600 text-white hover:brightness-110'
                        : 'border-white/10 bg-gradient-to-br from-slate-700 to-slate-800 text-white hover:scale-[1.03] hover:from-slate-600 hover:to-slate-700',
                  ].join(' ')}
                >
                  {t.isRevealed ? (
                    t.isRickRoll ? (
                      <span>🎵</span>
                    ) : t.adjacentCount > 0 ? (
                      <span className={getNumberColor(t.adjacentCount)}>{t.adjacentCount}</span>
                    ) : (
                      // Minesweeper ô 0 thường trống
                      <span className="text-transparent">0</span>
                    )
                  ) : t.isFlagged ? (
                    <span>🚩</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showVideoOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-black p-4 shadow-2xl">
            <button
              type="button"
              onClick={closeVideoOverlay}
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
                onEnded={handleVideoEnded}
              />
            </div>

            {videoNeedsUserStart && (
              <div className="mt-4 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-white/80">
                  Trình duyệt chặn autoplay có tiếng. Bấm nút để phát âm thanh.
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

      {/* Watermark */}
      <div className="pointer-events-none fixed bottom-3 right-4 z-[10001] text-xs font-medium tracking-wide text-white/35 sm:bottom-4 sm:right-5 sm:text-sm">
        Dev: Anh Minh
      </div>
    </div>
  );
}