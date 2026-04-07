'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  onBackHome: () => void;
};

type Cell = 0 | 1 | 2;
type Winner = 0 | 1 | 2;

const SIZE = 20;
const WIN_COUNT = 5;

const PLAYER_1_NAME = 'Diddy';
const PLAYER_2_NAME = 'Epstein';

const PLAYER_1_IMAGE = '/images/player1.png';
const PLAYER_2_IMAGE = '/images/player2.png';
const TICK_SOUND_URL = '/sounds/tick.mp3';
const WIN_SOUND_URL = '/sounds/sound.mp3';

function createBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function isInside(row: number, col: number) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function checkWinner(board: Cell[][], row: number, col: number, player: 1 | 2): boolean {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    let r = row + dr;
    let c = col + dc;
    while (isInside(r, c) && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (isInside(r, c) && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= WIN_COUNT) return true;
  }

  return false;
}

function getPlayerName(player: 1 | 2 | 0) {
  if (player === 1) return PLAYER_1_NAME;
  if (player === 2) return PLAYER_2_NAME;
  return '';
}

function getPlayerImage(player: 1 | 2 | 0) {
  if (player === 1) return PLAYER_1_IMAGE;
  if (player === 2) return PLAYER_2_IMAGE;
  return '';
}

export default function MemeGomoku({ onBackHome }: Props) {
  const [board, setBoard] = useState<Cell[][]>(createBoard());
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<Winner>(0);

  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const moves = useMemo(() => {
    return board.flat().filter((cell) => cell !== 0).length;
  }, [board]);

  useEffect(() => {
    if (winner !== 0 && winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.play().catch(() => {});
    }
  }, [winner]);

  function stopWinSound() {
    if (winAudioRef.current) {
      winAudioRef.current.pause();
      winAudioRef.current.currentTime = 0;
    }
  }

  function restartGame() {
    stopWinSound();
    setBoard(createBoard());
    setCurrentPlayer(1);
    setWinner(0);
  }

  function playTickSound() {
    if (!tickAudioRef.current) return;
    tickAudioRef.current.currentTime = 0;
    tickAudioRef.current.play().catch(() => {});
  }

  function handleCellClick(row: number, col: number) {
    if (winner !== 0) return;
    if (board[row][col] !== 0) return;

    playTickSound();

    const nextBoard = board.map((r) => [...r]) as Cell[][];
    nextBoard[row][col] = currentPlayer;
    setBoard(nextBoard);

    if (checkWinner(nextBoard, row, col, currentPlayer)) {
      setWinner(currentPlayer);
      return;
    }

    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  }

  function handleBackHomeWithStopSound() {
    stopWinSound();
    onBackHome();
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <audio ref={tickAudioRef} src={TICK_SOUND_URL} preload="auto" />
      <audio ref={winAudioRef} src={WIN_SOUND_URL} preload="auto" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
              Board: <span className="text-cyan-300">20x20</span>
            </div>
            <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
              Win: <span className="text-pink-300">5 in a row</span>
            </div>
            <div className="rounded-xl bg-black/20 px-4 py-2 font-semibold">
              Moves: <span className="text-yellow-300">{moves}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restartGame}
              className="rounded-xl bg-white/15 px-4 py-2 font-semibold transition hover:bg-white/25"
            >
              Restart
            </button>
            <button
              onClick={handleBackHomeWithStopSound}
              className="rounded-xl bg-pink-500/80 px-4 py-2 font-semibold transition hover:bg-pink-500"
            >
              Home
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2">
            <img
              src={PLAYER_1_IMAGE}
              alt={PLAYER_1_NAME}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-bold">{PLAYER_1_NAME}</span>
          </div>

          <div className="text-xl font-black text-white/70">VS</div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2">
            <img
              src={PLAYER_2_IMAGE}
              alt={PLAYER_2_NAME}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-bold">{PLAYER_2_NAME}</span>
          </div>
        </div>

        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
            <span className="text-white/80">Current Turn:</span>
            <img
              src={getPlayerImage(currentPlayer)}
              alt={getPlayerName(currentPlayer)}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-black text-pink-300">{getPlayerName(currentPlayer)}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-full overflow-auto rounded-3xl border border-white/10 bg-black/20 p-3 shadow-2xl backdrop-blur sm:p-4">
            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
              }}
            >
              {board.flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-white/10 bg-white/10 transition hover:bg-white/20 sm:h-7 sm:w-7 md:h-8 md:w-8"
                  >
                    {cell === 1 && (
                      <img
                        src={PLAYER_1_IMAGE}
                        alt={PLAYER_1_NAME}
                        className="h-full w-full rounded-[4px] object-cover"
                      />
                    )}
                    {cell === 2 && (
                      <img
                        src={PLAYER_2_IMAGE}
                        alt={PLAYER_2_NAME}
                        className="h-full w-full rounded-[4px] object-cover"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {winner !== 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-purple-950 p-6 text-center shadow-2xl">
            <h2 className="text-3xl font-black text-emerald-300">
              {getPlayerName(winner)} Wins! 🎉
            </h2>

            <div className="mt-5 flex justify-center">
              <img
                src={getPlayerImage(winner)}
                alt={getPlayerName(winner)}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-400/40"
              />
            </div>

            <p className="mt-4 text-white/80">
              Ván này {getPlayerName(winner)} đã nối được 5 quân liên tiếp.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={restartGame}
                className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-3 font-bold transition hover:scale-[1.02]"
              >
                Play Again
              </button>
              <button
                onClick={handleBackHomeWithStopSound}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/20"
              >
                Home
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