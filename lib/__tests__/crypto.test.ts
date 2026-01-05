import { describe, expect, it } from "vitest";
import { generateSecureToken } from "../crypto";

const HEX_PATTERN = /^[0-9a-f]{64}$/;

describe("generateSecureToken", () => {
  it("64文字のトークンを生成する", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
  });

  it("16進数文字のみを含む", () => {
    const token = generateSecureToken();
    expect(token).toMatch(HEX_PATTERN);
  });

  it("一意なトークンを生成する", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    const token3 = generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it("すべて小文字の16進数文字を使用する", () => {
    const token = generateSecureToken();
    expect(token).toBe(token.toLowerCase());
    expect(token).not.toContain("A");
    expect(token).not.toContain("F");
  });

  it("十分なエントロピーを持つトークンを生成する", () => {
    const tokens = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      tokens.add(generateSecureToken());
    }

    expect(tokens.size).toBe(count);
  });
});
