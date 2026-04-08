'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Tile = {
  id: number;
  row: number;
  col: number;
  isRickRoll: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentCount: number;
};

type Props = {
  onBackHome?: () => void;
};

const GRID_SIZE = 20;
const RICKROLL_COUNT = 145;

const BEST_SCORE_KEY = 'rickroll-sweeper-best-score';
const RICKROLL_VIDEO_URL = '/videos/rickroll.mp4';
const LOSE_TEXT = 'Bạn đã bị rick roll rồi 😂';

function createEmptyGrid(): Tile[][] {
  let id = 0;
  const grid: Tile[][] = [];

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

function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((tile) => ({ ...tile })));
}

function getNeighbors(row: number, col: number) {
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

function getIndex(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function computeAdjacentCounts(grid: Tile[][]) {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col].isRickRoll) continue;

      let count = 0;
      for (const neighbor of getNeighbors(row, col)) {
        if (grid[neighbor.row][neighbor.col].isRickRoll) count++;
      }

      grid[row][col].adjacentCount = count;
    }
  }
}

function revealArea(gridInput: Tile[][], startRow: number, startCol: number) {
  const newGrid = cloneGrid(gridInput);
  const queue: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  const visited = new Set<number>();
  let revealedCount = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = getIndex(current.row, current.col);

    if (visited.has(key)) continue;
    visited.add(key);

    const tile = newGrid[current.row][current.col];

    if (!tile || tile.isRevealed || tile.isFlagged || tile.isRickRoll) continue;

    tile.isRevealed = true;
    revealedCount++;

    if (tile.adjacentCount === 0) {
      for (const neighbor of getNeighbors(current.row, current.col)) {
        const neighborTile = newGrid[neighbor.row][neighbor.col];
        if (!neighborTile) continue;
        if (neighborTile.isRevealed || neighborTile.isFlagged || neighborTile.isRickRoll) continue;
        queue.push({ row: neighbor.row, col: neighbor.col });
      }
    }
  }

  return { newGrid, revealedCount };
}

function revealAllMines(gridInput: Tile[][]) {
  const newGrid = cloneGrid(gridInput);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (newGrid[row][col].isRickRoll) {
        newGrid[row][col].isRevealed = true;
      }
    }
  }

  return newGrid;
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

/**
 * Tạo "safe blob" ngẫu nhiên quanh ô đầu tiên.
 * Blob này:
 * - luôn chứa ô đầu tiên
 * - méo, không đối xứng, không theo hình cố định
 * - thường cỡ 6-14 ô
 * - giúp vùng mở đầu có hình dạng tự nhiên hơn
 */
function generateRandomSafeBlob(startRow: number, startCol: number) {
  const safeSet = new Set<number>();
  const frontier: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];

  safeSet.add(getIndex(startRow, startCol));

  // random size blob
  const targetSize = 6 + Math.floor(Math.random() * 9); // 6 -> 14

  let pointer = 0;

  while (pointer < frontier.length && safeSet.size < targetSize) {
    const current = frontier[pointer++];
    const neighbors = getNeighbors(current.row, current.col).sort(() => Math.random() - 0.5);

    for (const neighbor of neighbors) {
      const key = getIndex(neighbor.row, neighbor.col);
      if (safeSet.has(key)) continue;

      // xác suất thêm vào để blob méo ngẫu nhiên
      const chance = 0.45 + Math.random() * 0.35;
      if (Math.random() < chance) {
        safeSet.add(key);
        frontier.push(neighbor);
      }

      if (safeSet.size >= targetSize) break;
    }
  }

  // đảm bảo tối thiểu có một ít ô xung quanh
  const around = getNeighbors(startRow, startCol).sort(() => Math.random() - 0.5);
  for (const n of around) {
    if (safeSet.size >= 6) break;
    safeSet.add(getIndex(n.row, n.col));
  }

  return safeSet;
}

function placeMinesAfterFirstClick(baseGrid: Tile[][], clickedRow: number, clickedCol: number) {
  const nextGrid = cloneGrid(baseGrid);

  // reset mine/adjacent/revealed
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      nextGrid[row][col].isRickRoll = false;
      nextGrid[row][col].adjacentCount = 0;
      nextGrid[row][col].isRevealed = false;
    }
  }

  // Tạo safe blob ngẫu nhiên
  const safeBlob = generateRandomSafeBlob(clickedRow, clickedCol);

  // đảm bảo thêm ô đầu + 8 ô quanh vẫn an toàn để first click luôn đẹp
  safeBlob.add(getIndex(clickedRow, clickedCol));
  for (const neighbor of getNeighbors(clickedRow, clickedCol)) {
    safeBlob.add(getIndex(neighbor.row, neighbor.col));
  }

  const availableIndices: number[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const index = getIndex(row, col);
      if (!safeBlob.has(index)) {
        availableIndices.push(index);
      }
    }
  }

  // shuffle
  for (let i = availableIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
  }

  const chosenMines = availableIndices.slice(0, RICKROLL_COUNT);

  for (const index of chosenMines) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    nextGrid[row][col].isRickRoll = true;
  }

  computeAdjacentCounts(nextGrid);

  return nextGrid;
}

function checkWin(grid: Tile[][]) {
  const safeTileCount = GRID_SIZE * GRID_SIZE - RICKROLL_COUNT;
  const revealedSafeTiles = grid.flat().filter((tile) => tile.isRevealed && !tile.isRickRoll).length;
  return revealedSafeTiles === safeTileCount;
}

export default function RickRollSweeper({ onBackHome }: Props) {
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

  const totalRevealedSafe = useMemo(() => {
    return grid.flat().filter((tile) => tile.isRevealed && !tile.isRickRoll).length;
  }, [grid]);

  const totalFlags = useMemo(() => {
    return grid.flat().filter((tile) => tile.isFlagged).length;
  }, [grid]);

  function stopVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  function startNewGame() {
    stopVideo();
    setShowVideoOverlay(false);
    setShowGameOverModal(false);
    setVideoNeedsUserStart(false);

    setGrid(createEmptyGrid());
    setMinesPlaced(false);

    setScore(0);
    setGameOver(false);
    setWon(false);
  }

  function updateBestScore(finalScore: number) {
    const nextBest = Math.max(finalScore, bestScore);
    setBestScore(nextBest);
    localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
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

  function handleLose(finalScore: number, nextGrid: Tile[][]) {
    setGameOver(true);
    setWon(false);
    updateBestScore(finalScore);

    setGrid(revealAllMines(nextGrid));
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
    if (!minesPlaced) return;
    if (gameOver) return;
    if (showVideoOverlay || showGameOverModal) return;

    setGrid((prev) => {
      const next = cloneGrid(prev);
      const tile = next[row][col];
      if (!tile || tile.isRevealed) return prev;
      tile.isFlagged = !tile.isFlagged;
      return next;
    });
  }

  function handleTileClick(row: number, col: number) {
    if (gameOver) return;
    if (showVideoOverlay || showGameOverModal) return;

    const tile = grid[row]?.[col];
    if (!tile || tile.isRevealed || tile.isFlagged) return;

    // FIRST CLICK
    if (!minesPlaced) {
      const initializedGrid = placeMinesAfterFirstClick(grid, row, col);
      const { newGrid, revealedCount } = revealArea(initializedGrid, row, col);

      setGrid(newGrid);
      setMinesPlaced(true);
      setScore(revealedCount);

      if (checkWin(newGrid)) {
        setWon(true);
        setGameOver(true);
        updateBestScore(revealedCount);
        setShowVideoOverlay(false);
        setShowGameOverModal(true);
      }

      return;
    }

    // normal click
    if (tile.isRickRoll) {
      const nextGrid = cloneGrid(grid);
      nextGrid[row][col].isRevealed = true;
      setGrid(nextGrid);
      handleLose(score, nextGrid);
      return;
    }

    const { newGrid, revealedCount } = revealArea(grid, row, col);
    if (revealedCount <= 0) return;

    const nextScore = score + revealedCount;
    setGrid(newGrid);
    setScore(nextScore);

    if (checkWin(newGrid)) {
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
            <div 