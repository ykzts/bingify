import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("クラス名を正しくマージする", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("条件付きクラスを処理する", () => {
    const isLarge = false;
    expect(cn("text-base", isLarge && "text-lg", "font-bold")).toBe(
      "text-base font-bold"
    );
  });

  it("配列を処理する", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });

  it("Tailwindクラスを重複排除してマージする", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("引数なしの場合は空文字列を返す", () => {
    expect(cn()).toBe("");
  });

  it("undefinedとnull値を処理する", () => {
    expect(cn("text-base", undefined, null, "font-bold")).toBe(
      "text-base font-bold"
    );
  });
});
