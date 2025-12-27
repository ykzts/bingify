import { describe, expect, it } from "vitest";
import { generateRandomKey } from "../utils/random-key";

const RANDOM_KEY_PATTERN = /^[a-z0-9-]+$/;
const ALPHANUMERIC_PATTERN = /^[a-z0-9]+$/;

describe("generateRandomKey", () => {
  it("should generate a key with correct format", () => {
    const key = generateRandomKey();
    expect(key).toMatch(RANDOM_KEY_PATTERN);
  });

  it("should generate a key with expected length including hyphens", () => {
    const key = generateRandomKey();
    // With length=11, we get: 3 chars + hyphen + 3 chars + hyphen + 3 chars + hyphen + 2 chars = 14 total
    expect(key).toHaveLength(14);
  });

  it("should only use lowercase letters and numbers", () => {
    const key = generateRandomKey();
    const withoutHyphens = key.replace(/-/g, "");
    expect(withoutHyphens).toMatch(ALPHANUMERIC_PATTERN);
  });

  it("should generate unique keys", () => {
    const key1 = generateRandomKey();
    const key2 = generateRandomKey();
    const key3 = generateRandomKey();

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it("should have hyphens at expected positions", () => {
    const key = generateRandomKey();
    // Expected format: xxx-xxx-xxx-xx (hyphens at positions 3, 7, 11)
    expect(key[3]).toBe("-");
    expect(key[7]).toBe("-");
    expect(key[11]).toBe("-");
  });

  it("should generate keys with sufficient entropy", () => {
    // Generate multiple keys and check they're all different
    const keys = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      keys.add(generateRandomKey());
    }

    // All keys should be unique
    expect(keys.size).toBe(count);
  });

  it("should generate keys with custom length", () => {
    const key8 = generateRandomKey(8);
    // With length=8, we get: 3 chars + hyphen + 3 chars + hyphen + 2 chars = 10 total
    expect(key8).toHaveLength(10);

    const key5 = generateRandomKey(5);
    // With length=5, we get: 3 chars + hyphen + 2 chars = 6 total
    expect(key5).toHaveLength(6);
  });

  it("should handle edge case of length 3", () => {
    const key3 = generateRandomKey(3);
    // With length=3, we get: 3 chars with no hyphens
    expect(key3).toHaveLength(3);
    expect(key3).not.toContain("-");
  });

  it("should only contain valid URL-safe characters", () => {
    const validChars = "abcdefghijklmnopqrstuvwxyz0123456789-";
    const key = generateRandomKey();

    for (const char of key) {
      expect(validChars).toContain(char);
    }
  });
});
