import { describe, expect, it } from "vitest";
import { generateSecureToken } from "../crypto";

const HEX_PATTERN = /^[0-9a-f]{64}$/;

describe("generateSecureToken", () => {
  it("should generate a 64-character token", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
  });

  it("should contain only hexadecimal characters", () => {
    const token = generateSecureToken();
    expect(token).toMatch(HEX_PATTERN);
  });

  it("should generate unique tokens", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    const token3 = generateSecureToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it("should use all lowercase hex characters", () => {
    const token = generateSecureToken();
    expect(token).toBe(token.toLowerCase());
    expect(token).not.toContain("A");
    expect(token).not.toContain("F");
  });

  it("should generate tokens with sufficient entropy", () => {
    // Generate multiple tokens and check they're all different
    const tokens = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      tokens.add(generateSecureToken());
    }

    // All tokens should be unique
    expect(tokens.size).toBe(count);
  });
});
