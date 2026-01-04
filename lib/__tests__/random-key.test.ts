import { describe, expect, it } from "vitest";
import { generateRandomKey } from "../utils/random-key";

const RANDOM_KEY_PATTERN = /^[a-z0-9-]+$/;
const ALPHANUMERIC_PATTERN = /^[a-z0-9]+$/;

describe("generateRandomKey", () => {
  it("正しいフォーマットでキーを生成する", () => {
    const key = generateRandomKey();
    expect(key).toMatch(RANDOM_KEY_PATTERN);
  });

  it("ハイフンを含む期待される長さでキーを生成する", () => {
    const key = generateRandomKey();
    expect(key).toHaveLength(14);
  });

  it("小文字と数字のみを使用する", () => {
    const key = generateRandomKey();
    const withoutHyphens = key.replace(/-/g, "");
    expect(withoutHyphens).toMatch(ALPHANUMERIC_PATTERN);
  });

  it("一意なキーを生成する", () => {
    const key1 = generateRandomKey();
    const key2 = generateRandomKey();
    const key3 = generateRandomKey();

    expect(key1).not.toBe(key2);
    expect(key2).not.toBe(key3);
    expect(key1).not.toBe(key3);
  });

  it("期待される位置にハイフンを持つ", () => {
    const key = generateRandomKey();
    expect(key[3]).toBe("-");
    expect(key[7]).toBe("-");
    expect(key[11]).toBe("-");
  });

  it("十分なエントロピーを持つキーを生成する", () => {
    const keys = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      keys.add(generateRandomKey());
    }

    expect(keys.size).toBe(count);
  });

  it("カスタム長でキーを生成する", () => {
    const key8 = generateRandomKey(8);
    expect(key8).toHaveLength(10);

    const key5 = generateRandomKey(5);
    expect(key5).toHaveLength(6);
  });

  it("長さ3のエッジケースを処理する", () => {
    const key3 = generateRandomKey(3);
    expect(key3).toHaveLength(3);
    expect(key3).not.toContain("-");
  });

  it("有効なURL安全文字のみを含む", () => {
    const validChars = "abcdefghijklmnopqrstuvwxyz0123456789-";
    const key = generateRandomKey();

    for (const char of key) {
      expect(validChars).toContain(char);
    }
  });
});
