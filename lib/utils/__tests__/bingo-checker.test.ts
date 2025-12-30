import { describe, expect, test } from "vitest";
import { checkBingoLines } from "../bingo-checker";

describe("checkBingoLines", () => {
  // Standard 5x5 bingo card with free space at [2][2]
  const testCard = [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, 0, 48, 63], // 0 is FREE space
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65],
  ];

  test("no bingo or reach with no numbers called", () => {
    const result = checkBingoLines(testCard, new Set());

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(0);
    expect(result.reachLines).toHaveLength(0);
  });

  test("detects horizontal bingo (row 0)", () => {
    const calledNumbers = new Set([1, 16, 31, 46, 61]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("horizontal");
    expect(result.bingoLines[0].index).toBe(0);
  });

  test("detects vertical bingo (col 1)", () => {
    const calledNumbers = new Set([16, 17, 18, 19, 20]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("vertical");
    expect(result.bingoLines[0].index).toBe(1);
  });

  test("detects diagonal bingo (top-left to bottom-right)", () => {
    // Numbers: 1, 17, FREE, 49, 65
    const calledNumbers = new Set([1, 17, 49, 65]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("diagonal");
    expect(result.bingoLines[0].index).toBe(0);
  });

  test("detects diagonal bingo (top-right to bottom-left)", () => {
    // Numbers: 61, 47, FREE, 19, 5
    const calledNumbers = new Set([61, 47, 19, 5]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("diagonal");
    expect(result.bingoLines[0].index).toBe(1);
  });

  test("detects reach (one number away from horizontal bingo)", () => {
    const calledNumbers = new Set([1, 16, 31, 46]); // Missing 61
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("horizontal");
    expect(result.reachLines[0].index).toBe(0);
  });

  test("detects reach (one number away from vertical bingo)", () => {
    const calledNumbers = new Set([16, 17, 18, 19]); // Missing 20
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("vertical");
    expect(result.reachLines[0].index).toBe(1);
  });

  test("detects reach with free space (one number away from diagonal)", () => {
    // Diagonal: 1, 17, FREE, 49, 65 - missing 65
    const calledNumbers = new Set([1, 17, 49]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("diagonal");
  });

  test("detects multiple bingo lines", () => {
    // Complete row 0 and col 1
    const calledNumbers = new Set([1, 16, 31, 46, 61, 17, 18, 19, 20]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines.length).toBeGreaterThanOrEqual(2);
  });

  test("detects both bingo and reach lines", () => {
    // Complete row 0, and almost complete col 1 (missing 20)
    const calledNumbers = new Set([1, 16, 31, 46, 61, 17, 18, 19]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(true);
    expect(result.bingoLines.length).toBeGreaterThanOrEqual(1);
    expect(result.reachLines.length).toBeGreaterThanOrEqual(1);
  });

  test("free space is always marked in center row", () => {
    // Row 2: 3, 18, FREE, 48, 63 - only need 4 numbers
    const calledNumbers = new Set([3, 18, 48, 63]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("horizontal");
    expect(result.bingoLines[0].index).toBe(2);
  });
});
