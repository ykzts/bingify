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
    checkLine(
      generateRowPositions(row),
      cardNumbers,
      calledNumbers,
      "horizontal",
      row,
      bingoLines,
      reachLines
    );
  }

  // Check vertical lines (columns)
  for (let col = 0; col < CARD_SIZE; col++) {
    checkLine(
      generateColPositions(col),
      cardNumbers,
      calledNumbers,
      "vertical",
      col,
      bingoLines,
      reachLines
    );
  }

  // Check diagonals
  checkLine(
    generateDiagonalPositions(0),
    cardNumbers,
    calledNumbers,
    "diagonal",
    0,
    bingoLines,
    reachLines
  );
  checkLine(
    generateDiagonalPositions(1),
    cardNumbers,
    calledNumbers,
    "diagonal",
    1,
    bingoLines,
    reachLines
  );

  return {
    bingoLines,
    hasBingo: bingoLines.length > 0,
    hasReach: reachLines.length > 0,
    reachLines,
  };
}

/**
 * Generate positions for a row
 */
function generateRowPositions(
  row: number
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  for (let col = 0; col < CARD_SIZE; col++) {
    positions.push({ row, col });
  }
  return positions;
}

/**
 * Generate positions for a column
 */
function generateColPositions(
  col: number
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < CARD_SIZE; row++) {
    positions.push({ row, col });
  }
  return positions;
}

/**
 * Generate positions for a diagonal
 * @param index - 0 for top-left to bottom-right, 1 for top-right to bottom-left
 */
function generateDiagonalPositions(
  index: number
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  for (let i = 0; i < CARD_SIZE; i++) {
    const row = i;
    const col = index === 0 ? i : CARD_SIZE - 1 - i;
    positions.push({ row, col });
  }
  return positions;
}

/**
 * Check a single line (row, column, or diagonal) for bingo or reach
 */
function checkLine(
  positions: Array<{ row: number; col: number }>,
  cardNumbers: number[][],
  calledNumbers: Set<number>,
  type: "horizontal" | "vertical" | "diagonal",
  index: number,
  bingoLines: BingoLine[],
  reachLines: BingoLine[]
): void {
  let markedCount = 0;

  for (const pos of positions) {
    if (
      isMarked(cardNumbers[pos.row][pos.col], calledNumbers, pos.row, pos.col)
    ) {
      markedCount++;
    }
  }

  if (markedCount === CARD_SIZE) {
    bingoLines.push({ index, positions, type });
  } else if (markedCount === CARD_SIZE - 1) {
    reachLines.push({ index, positions, type });
  }
}
