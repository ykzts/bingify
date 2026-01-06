import { describe, expect, it } from "vitest";
import { isValidOAuthProvider } from "../provider-validation";

describe("isValidOAuthProvider", () => {
  it("google に対して true を返す", () => {
    expect(isValidOAuthProvider("google")).toBe(true);
  });

  it("twitch に対して true を返す", () => {
    expect(isValidOAuthProvider("twitch")).toBe(true);
  });

  it("facebook に対して false を返す", () => {
    expect(isValidOAuthProvider("facebook")).toBe(false);
  });

  it("github に対して false を返す", () => {
    expect(isValidOAuthProvider("github")).toBe(false);
  });

  it("invalid に対して false を返す", () => {
    expect(isValidOAuthProvider("invalid")).toBe(false);
  });

  it("null に対して false を返す", () => {
    expect(isValidOAuthProvider(null)).toBe(false);
  });

  it("undefined に対して false を返す", () => {
    expect(isValidOAuthProvider(undefined)).toBe(false);
  });

  it("数値に対して false を返す", () => {
    expect(isValidOAuthProvider(123)).toBe(false);
  });

  it("オブジェクトに対して false を返す", () => {
    expect(isValidOAuthProvider({})).toBe(false);
  });

  it("配列に対して false を返す", () => {
    expect(isValidOAuthProvider([])).toBe(false);
  });

  it("空文字列に対して false を返す", () => {
    expect(isValidOAuthProvider("")).toBe(false);
  });
});
