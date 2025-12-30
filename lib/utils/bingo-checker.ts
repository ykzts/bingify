/**
 * Bingo line detection utility
 * Detects completed lines (bingo) and lines with one missing number (reach)
 */

export interface BingoLine {
  type: "horizontal" | "vertical" | "diagonal";
  index: number; // row/col index, or 0/1 for diagonals (0=top-left to bottom-right, 1=top-right to bottom-left)
  positions: Array<{ row: number; col: number }>;
}

export interface BingoCheckResult {
  hasBingo: boolean;
  hasReach: boolean;
  bingoLines: BingoLine[];
  reachLines: BingoLine[];
}

const CARD_SIZE = 5;
const FREE_SPACE_VALUE = 0;
const FREE_SPACE_ROW = 2;
const FREE_SPACE_COL = 2;

/**
 * Check if a number is called or is the free space
 */
function isMarked(
  number: number,
  calledNumbers: Set<number>,
  row: number,
  col: number
): boolean {
  if (row === FREE_SPACE_ROW && col === FREE_SPACE_COL) {
    return true; // Free space is always marked
  }
  return calledNumbers.has(number);
}

/**
 * Check all possible bingo lines and return the result
 */
export function checkBingoLines(
  cardNumbers: number[][],
  calledNumbers: Set<number>
): BingoCheckResult {
  const bingoLines: BingoLine[] = [];
  const reachLines: BingoLine[] = [];

  // Check horizontal lines (rows)
  for (let row = 0; row < CARD_SIZE; row++) {
    const positions: Array<{ row: number; col: number }> = [];
    let markedCount = 0;

    for (let col = 0; col < CARD_SIZE; col++) {
      positions.push({ row, col });
      if (isMarked(cardNumbers[row][col], calledNumbers, row, col)) {
        markedCount++;
      }
    }

    if (markedCount === CARD_SIZE) {
      bingoLines.push({ type: "horizontal", index: row, positions });
    } else if (markedCount === CARD_SIZE - 1) {
      reachLines.push({ type: "horizontal", index: row, positions });
    }
  }

  // Check vertical lines (columns)
  for (let col = 0; col < CARD_SIZE; col++) {
    const positions: Array<{ row: number; col: number }> = [];
    let markedCount = 0;

    for (let row = 0; row < CARD_SIZE; row++) {
      positions.push({ row, col });
      if (isMarked(cardNumbers[row][col], calledNumbers, row, col)) {
        markedCount++;
      }
    }

    if (markedCount === CARD_SIZE) {
      bingoLines.push({ type: "vertical", index: col, positions });
    } else if (markedCount === CARD_SIZE - 1) {
      reachLines.push({ type: "vertical", index: col, positions });
    }
  }

  // Check diagonal (top-left to bottom-right)
  {
    const positions: Array<{ row: number; col: number }> = [];
    let markedCount = 0;

    for (let i = 0; i < CARD_SIZE; i++) {
      positions.push({ row: i, col: i });
      if (isMarked(cardNumbers[i][i], calledNumbers, i, i)) {
        markedCount++;
      }
    }

    if (markedCount === CARD_SIZE) {
      bingoLines.push({ type: "diagonal", index: 0, positions });
    } else if (markedCount === CARD_SIZE - 1) {
      reachLines.push({ type: "diagonal", index: 0, positions });
    }
  }

  // Check diagonal (top-right to bottom-left)
  {
    const positions: Array<{ row: number; col: number }> = [];
    let markedCount = 0;

    for (let i = 0; i < CARD_SIZE; i++) {
      const row = i;
      const col = CARD_SIZE - 1 - i;
      positions.push({ row, col });
      if (isMarked(cardNumbers[row][col], calledNumbers, row, col)) {
        markedCount++;
      }
    }

    if (markedCount === CARD_SIZE) {
      bingoLines.push({ type: "diagonal", index: 1, positions });
    } else if (markedCount === CARD_SIZE - 1) {
      reachLines.push({ type: "diagonal", index: 1, positions });
    }
  }

  return {
    hasBingo: bingoLines.length > 0,
    hasReach: reachLines.length > 0,
    bingoLines,
    reachLines,
  };
}
