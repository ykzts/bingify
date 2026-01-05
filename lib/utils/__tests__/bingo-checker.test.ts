import { describe, expect, test } from "vitest";
import { checkBingoLines } from "../bingo-checker";

describe("checkBingoLines", () => {
  const testCard = [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, 0, 48, 63],
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65],
  ];

  test("番号が呼ばれていない場合はビンゴもリーチもない", () => {
    const result = checkBingoLines(testCard, new Set());

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(0);
    expect(result.reachLines).toHaveLength(0);
  });

  test("横のビンゴを検出する（行0）", () => {
    const calledNumbers = new Set([1, 16, 31, 46, 61]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("horizontal");
    expect(result.bingoLines[0].index).toBe(0);
  });

  test("縦のビンゴを検出する（列1）", () => {
    const calledNumbers = new Set([16, 17, 18, 19, 20]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("vertical");
    expect(result.bingoLines[0].index).toBe(1);
  });

  test("斜めのビンゴを検出する（左上から右下）", () => {
    const calledNumbers = new Set([1, 17, 49, 65]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("diagonal");
    expect(result.bingoLines[0].index).toBe(0);
  });

  test("斜めのビンゴを検出する（右上から左下）", () => {
    const calledNumbers = new Set([61, 47, 19, 5]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(false);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("diagonal");
    expect(result.bingoLines[0].index).toBe(1);
  });

  test("リーチを検出する（横のビンゴまであと1つ）", () => {
    const calledNumbers = new Set([1, 16, 31, 46]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("horizontal");
    expect(result.reachLines[0].index).toBe(0);
  });

  test("リーチを検出する（縦のビンゴまであと1つ）", () => {
    const calledNumbers = new Set([16, 17, 18, 19]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("vertical");
    expect(result.reachLines[0].index).toBe(1);
  });

  test("フリースペースを含むリーチを検出する（斜めまであと1つ）", () => {
    const calledNumbers = new Set([1, 17, 49]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(false);
    expect(result.hasReach).toBe(true);
    expect(result.reachLines).toHaveLength(1);
    expect(result.reachLines[0].type).toBe("diagonal");
  });

  test("複数のビンゴラインを検出する", () => {
    const calledNumbers = new Set([1, 16, 31, 46, 61, 17, 18, 19, 20]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines.length).toBeGreaterThanOrEqual(2);
  });

  test("ビンゴとリーチの両方を検出する", () => {
    const calledNumbers = new Set([1, 16, 31, 46, 61, 17, 18, 19]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.hasReach).toBe(true);
    expect(result.bingoLines.length).toBeGreaterThanOrEqual(1);
    expect(result.reachLines.length).toBeGreaterThanOrEqual(1);
  });

  test("フリースペースは中央行で常にマークされている", () => {
    const calledNumbers = new Set([3, 18, 48, 63]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines).toHaveLength(1);
    expect(result.bingoLines[0].type).toBe("horizontal");
    expect(result.bingoLines[0].index).toBe(2);
  });

  test("クロスパターンを検出する（中央を通る横と縦）", () => {
    const calledNumbers = new Set([3, 18, 48, 63, 31, 32, 34, 35]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines).toHaveLength(2);

    const horizontalLine = result.bingoLines.find(
      (l) => l.type === "horizontal"
    );
    const verticalLine = result.bingoLines.find((l) => l.type === "vertical");

    expect(horizontalLine).toBeDefined();
    expect(horizontalLine?.index).toBe(2);
    expect(verticalLine).toBeDefined();
    expect(verticalLine?.index).toBe(2);
  });

  test("3つのラインタイプを同時に検出する（横+縦+斜め）", () => {
    const calledNumbers = new Set([1, 16, 31, 46, 61, 2, 3, 4, 5, 17, 49, 65]);
    const result = checkBingoLines(testCard, calledNumbers);

    expect(result.hasBingo).toBe(true);
    expect(result.bingoLines).toHaveLength(3);

    const horizontalLine = result.bingoLines.find(
      (l) => l.type === "horizontal"
    );
    const verticalLine = result.bingoLines.find((l) => l.type === "vertical");
    const diagonalLine = result.bingoLines.find((l) => l.type === "diagonal");

    expect(horizontalLine).toBeDefined();
    expect(horizontalLine?.index).toBe(0);
    expect(verticalLine).toBeDefined();
    expect(verticalLine?.index).toBe(0);
    expect(diagonalLine).toBeDefined();
    expect(diagonalLine?.index).toBe(0);
  });
});
