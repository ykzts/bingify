import { describe, expect, it } from "vitest";
import { getBingoCellClassName } from "../bingo-cell-styles";

describe("getBingoCellClassName", () => {
  it("選択済みセルのクラス名を返す", () => {
    const className = getBingoCellClassName(true);

    expect(className).toContain("border-blue-600");
    expect(className).toContain("bg-blue-600");
    expect(className).toContain("text-white");
    expect(className).toContain("dark:border-blue-500");
    expect(className).toContain("dark:bg-blue-500");
  });

  it("未選択セルのクラス名を返す", () => {
    const className = getBingoCellClassName(false);

    expect(className).toContain("border-gray-300");
    expect(className).toContain("bg-white");
    expect(className).toContain("text-black");
    expect(className).toContain("dark:border-gray-600");
    expect(className).toContain("dark:bg-gray-800");
    expect(className).toContain("dark:text-white");
  });

  it("共通のクラス名を含む", () => {
    const calledClassName = getBingoCellClassName(true);
    const uncalledClassName = getBingoCellClassName(false);

    const commonClasses = [
      "flex",
      "aspect-square",
      "items-center",
      "justify-center",
      "rounded",
      "border-2",
      "font-bold",
      "text-xl",
    ];

    for (const commonClass of commonClasses) {
      expect(calledClassName).toContain(commonClass);
      expect(uncalledClassName).toContain(commonClass);
    }
  });
});
