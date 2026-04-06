'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Screen = 'home' | 'game';

type Tile = {
  id: number;
  row: number;
  col: number;
  isRickRoll: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentCount: number;
};

const GRID_SIZE = 20;
const RICKROLL_COUNT = 70;
const BEST_SCORE_KEY = 'rickroll-sweeper-best-score';
const RICKROLL_VIDEO_URL = '/videos/rickroll.mp4';
const HOME_BG_URL = '/images/rickroll-bg.jpg';

function createEmptyGrid(): Tile[][] {
  const grid: Tile[][] = [];
  let id = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    const currentRow: Tile[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      currentRow.push({
        id: id++,
        row,
        col,
        isRickRoll: false,
        isRevealed: false,
        isFlagged: false,
        adjacentCount: 0,
      });
    }
    grid.push(currentRow);
  }

  return grid;
}

function getNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
  const neighbors: Array<{ row: number; col: number }> = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;

      const nr = row + dr;
      const nc = col + dc;

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        neighbors.push({ row: nr, col: nc });
      }
    }
  }

  return neighbors;
}

function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((tile) => ({ ...tile })));
}

function generateGrid(): Tile[][] {
  const grid = createEmptyGrid();
  const chosen = new Set<number>();

  while (chosen.size < RICKROLL_COUNT) {
    chosen.add(Math.floor(Math.random() * GRID_SIZE * GRID_SIZE));
  }

  chosen.forEach((index) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    grid[row][col].isRickRoll = true;
  });

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col].isRickRoll) continue;

      const count = getNeighbors(row, col).filter(
        ({ row: nr, col: nc }) => grid[nr][nc].isRickRoll
      ).length;

      grid[row][col].adjacentCount = count;
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

export default function RickRollSweeper() {
  const [screen, setScreen] = useState<Screen>('home');
  const [grid, setGrid] = useState<Tile[][]>([]);
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

  const totalRevealed = useMemo(() => {
    return grid.flat().filter((tile) => tile.isRevealed && !tile.isRickRoll).length;
  }, [grid]);

  const totalFlags = useMemo(() => {
    return grid.flat().filter((tile) => tile.isFlagged).length;
  }, [grid]);

  function startNewGame() {
    setGrid(generateGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setVideoNeedsUserStart(false);
  }

  function handlePlay() {
    startNewGame();
    setScreen('game');
  }

  function handleRestart() {
    startNewGame();
  }

  function updateBestScore(finalScore: number) {
    const nextBest = Math.max(finalScore, bestScore);
    setBestScore(nextBest);
    localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
  }

  function revealAllRickRolls(inputGrid: Tile[][]): Tile[][] {
    const newGrid = cloneGrid(inputGrid);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (newGrid[row][col].isRickRoll) {
          newGrid[row][col].isRevealed = true;
        }
      }
    }

    return newGrid;
  }

  function revealArea(inputGrid: Tile[][], startRow: number, startCol: number) {
    const newGrid = cloneGrid(inputGrid);
    const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
    const visited = new Set<string>();
    let revealedCount = 0;
    let pointer = 0;

    while (pointer < queue.length) {
      const current = queue[pointer];
      pointer += 1;

      const key = `${current.row}-${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const tile = newGrid[current.row][current.col];

      if (!tile || tile.isRevealed || tile.isRickRoll || tile.isFlagged) continue;

      tile.isRevealed = true;
      revealedCount++;

      if (tile.adjacentCount === 0) {
        const neighbors = getNeighbors(current.row, current.col);

        for (const neighbor of neighbors) {
          const neighborTile = newGrid[neighbor.row][neighbor.col];
          if (
            neighborTile &&
            !neighborTile.isRevealed &&
            !neighborTile.isRickRoll &&
            !neighborTile.isFlagged
          ) {
            queue.push(neighbor);
          }
        }
      }
    }

    return { newGrid, revealedCount };
  }

  function checkWin(nextGrid: Tile[][]) {
    const safeTiles = GRID_SIZE * GRID_SIZE - RICKROLL_COUNT;
    const revealedSafe = nextGrid
      .flat()
      .filter((tile) => tile.isRevealed && !tile.isRickRoll).length;

    return revealedSafe === safeTiles;
  }

  function tryPlayVideoWithSound() {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoNeedsUserStart(false);
        })
        .catch(() => {
          video.muted = true;
          video
            .play()
            .then(() => {
              setVideoNeedsUserStart(true);
            })
            .catch(() => {
              setVideoNeedsUserStart(true);
            });
        });
    }
  }

  function handleLose(nextGrid?: Tile[][], finalScore?: number) {
    setGameOver(true);
    setWon(false);
    updateBestScore(finalScore ?? score);
    setShowVideoOverlay(true);
    setShowGameOverModal(false);

    if (nextGrid) {
      setGrid(revealAllRickRolls(nextGrid));
    } else {
      setGrid((prev) => revealAllRickRolls(prev));
    }

    setTimeout(() => {
      tryPlayVideoWithSound();
    }, 120);
  }

  function handleTileClick(row: number, col: number) {
    if (gameOver || showVideoOverlay || showGameOverModal) return;

    const clickedTile = grid[row]?.[col];
    if (!clickedTile || clickedTile.isRevealed || clickedTile.isFlagged) return;

    if (clickedTile.isRickRoll) {
      const newGrid = cloneGrid(grid);
      newGrid[row][col].isRevealed = true;
      setGrid(newGrid);
      handleLose(newGrid, score);
      return;
    }

    const { newGrid, revealedCount } = revealArea(grid, row, col);
    const nextScore = score + revealedCount;

    setGrid(newGrid);

    if (revealedCount > 0) {
      setScore(nextScore);
    }

    if (checkWin(newGrid)) {
      setWon(true);
      setGameOver(true);
      updateBestScore(nextScore);
      setShowVideoOverlay(false);
      setShowGameOverModal(true);
    }
  }

  function handleRightClick(
    e: React.MouseEvent<HTMLButtonElement>,
    row: number,
    col: number
  ) {
    e.preventDefault();

    if (gameOver || showVideoOverlay || showGameOverModal) return;

    const tile = grid[row]?.[col];
    if (!tile || tile.isRevealed) return;

    const newGrid = cloneGrid(grid);
    newGrid[row][col].isFlagged = !newGrid[row][col].isFlagged;
    setGrid(newGrid);
  }

  function closeVideoOverlay() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setShowVideoOverlay(false);
    setShowGameOverModal(true);
    setVideoNeedsUserStart(false);
  }

  function handleVideoEnded() {
    closeVideoOverlay();
  }

  function handlePlayAgain() {
    startNewGame();
  }

  function handleBackHome() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setGameOver(false);
    setWon(false);
    setVideoNeedsUserStart(false);
    setScreen('home');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-950 via-purple-900 to-indigo-950 text-white">
      {screen === 'home' && (
        <div
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
          style={{
            backgroundImage: `url('${HOME_BG_URL}')`,
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

            <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
              Rick Roll Sweeper
            </h1>

            <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
              Chọn ô an toàn, tránh bị Rick Roll. Gameplay kiểu Dò Mìn với bản đồ
              20x20, có mở vùng, cắm cờ và lưu best score.
            </p>

            <button
              onClick={handlePlay}
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
                Revealed: <span className="text-cyan-300">{totalRevealed}</span>
              </div>
              <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
                Flags: <span className="text-orange-300">{totalFlags}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="rounded-xl bg-white/15 px-4 py-2 font-semibold transition hover:bg-white/25"
              >
                Restart
              </button>
              <button
                onClick={handleBackHome}
                className="rounded-xl bg-pink-500/80 px-4 py-2 font-semibold transition hover:bg-pink-500"
              >
                Home
              </button>
            </div>
          </div>

          <div className="mb-3 text-center text-xs text-white/70 sm:text-sm">
            Left click to reveal • Right click to place/remove a flag 🚩
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-full overflow-auto rounded-3xl border border-white/10 bg-black/20 p-3 shadow-2xl backdrop-blur sm:p-4">
              <div
                className="grid gap-[2px] sm:gap-1"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                }}
              >
                {grid.flat().map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile.row, tile.col)}
                    onContextMenu={(e) => handleRightClick(e, tile.row, tile.col)}
                    disabled={gameOver || tile.isRevealed}
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
                        <span className={getNumberColor(tile.adjacentCount)}>
                          {tile.adjacentCount}
                        </span>
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
              onClick={(e) => {
                e.stopPropagation();
                closeVideoOverlay();
              }}
              className="absolute right-3 top-3 z-[10000] rounded-lg bg-white/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/30"
            >
              Close Video
            </button>

            <div className="mb-3 pr-28 text-lg font-extrabold text-pink-300 sm:text-2xl">
              You got Rick Rolled!
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
                  Trình duyệt đang chặn autoplay có tiếng. Bấm nút bên dưới để phát
                  Rick Roll với âm thanh.
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
              {won ? 'You Win!' : 'You got Rick Rolled!'}
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
                onClick={handlePlayAgain}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-3 font-bold transition hover:scale-[1.02]"
              >
                Play Again
              </button>
              <button
                onClick={handleBackHome}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/20"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}