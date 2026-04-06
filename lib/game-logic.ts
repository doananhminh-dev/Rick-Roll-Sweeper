export interface Square {
  isRickRoll: boolean;
  isRevealed: boolean;
  adjacentRickRolls: number;
}

export type GameState = 'playing' | 'won' | 'lost';

const GRID_SIZE = 9;
const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE;
const RICK_ROLLS = 13;
const SAFE_SQUARES = TOTAL_SQUARES - RICK_ROLLS;

export function createGrid(): Square[][] {
  // Create empty grid
  const grid: Square[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({
        isRickRoll: false,
        isRevealed: false,
        adjacentRickRolls: 0,
      }))
    );

  // Randomly place Rick Rolls
  let placed = 0;
  while (placed < RICK_ROLLS) {
    const row = Math.floor(Math.random() * GRID_SIZE);
    const col = Math.floor(Math.random() * GRID_SIZE);

    if (!grid[row][col].isRickRoll) {
      grid[row][col].isRickRoll = true;
      placed++;
    }
  }

  // Calculate adjacent Rick Roll counts
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!grid[row][col].isRickRoll) {
        grid[row][col].adjacentRickRolls = countAdjacentRickRolls(grid, row, col);
      }
    }
  }

  return grid;
}

function countAdjacentRickRolls(grid: Square[][], row: number, col: number): number {
  let count = 0;
  for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
      if ((r !== row || c !== col) && grid[r][c].isRickRoll) {
        count++;
      }
    }
  }
  return count;
}

function getAdjacentSquares(row: number, col: number): Array<[number, number]> {
  const adjacent: Array<[number, number]> = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
      if (r !== row || c !== col) {
        adjacent.push([r, c]);
      }
    }
  }
  return adjacent;
}

export function revealSquare(
  grid: Square[][],
  row: number,
  col: number
): { newGrid: Square[][]; gameState: GameState; revealedCount: number } {
  const newGrid = grid.map(r => [...r]);

  // Check if it's a Rick Roll
  if (newGrid[row][col].isRickRoll) {
    newGrid[row][col].isRevealed = true;
    return {
      newGrid,
      gameState: 'lost',
      revealedCount: 1,
    };
  }

  // If the clicked square has adjacent Rick Rolls, just reveal it
  if (newGrid[row][col].adjacentRickRolls > 0) {
    newGrid[row][col].isRevealed = true;
    return {
      newGrid,
      gameState: checkWinCondition(newGrid),
      revealedCount: 1,
    };
  }

  // Use flood fill for empty squares (adjacentRickRolls === 0)
  const queue: Array<[number, number]> = [[row, col]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Reveal this square
    newGrid[r][c].isRevealed = true;

    // Only continue flood fill if this square is empty (adjacentRickRolls === 0)
    if (newGrid[r][c].adjacentRickRolls === 0) {
      const adjacent = getAdjacentSquares(r, c);
      for (const [ar, ac] of adjacent) {
        const adjacentKey = `${ar},${ac}`;
        
        // Skip if already visited
        if (visited.has(adjacentKey)) continue;
        
        // Skip Rick Rolls
        if (newGrid[ar][ac].isRickRoll) continue;
        
        // Add to queue to process (will reveal even numbered squares)
        queue.push([ar, ac]);
      }
    }
  }

  // Count total revealed
  const gameState = checkWinCondition(newGrid);

  return {
    newGrid,
    gameState,
    revealedCount: 0,
  };
}

function checkWinCondition(grid: Square[][]): GameState {
  let totalRevealed = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].isRevealed && !grid[r][c].isRickRoll) {
        totalRevealed++;
      }
    }
  }
  return totalRevealed === SAFE_SQUARES ? 'won' : 'playing';
}

export function countRevealedSafeSquares(grid: Square[][]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c].isRevealed && !grid[r][c].isRickRoll) {
        count++;
      }
    }
  }
  return count;
}
