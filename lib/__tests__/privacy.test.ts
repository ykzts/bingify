import { describe, expect, test } from "vitest";
import { maskEmail, maskEmailPatterns } from "../privacy";

describe("maskEmail", () => {
  test("メールアドレスを正しくマスクする", () => {
    expect(maskEmail("user@example.com")).toBe("u***@example.com");
    expect(maskEmail("test@google.com")).toBe("t***@google.com");
    expect(maskEmail("a@test.org")).toBe("a***@test.org");
    expect(maskEmail("john.doe@company.co.jp")).toBe("j***@company.co.jp");
  });

  test("エッジケースを処理する", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail("invalid")).toBe("invalid");
    expect(maskEmail("@example.com")).toBe("***@example.com");
  });

  test("ドメイン部分を保持する", () => {
    const masked = maskEmail("user@example.com");
    expect(masked).toContain("@example.com");
    expect(masked.split("@")[1]).toBe("example.com");
  });
});

describe("maskEmailPatterns", () => {
  test("配列内のメールアドレスをマスクする", () => {
    const patterns = ["user@example.com", "test@google.com"];
    const masked = maskEmailPatterns(patterns);

    expect(masked).toEqual(["u***@example.com", "t***@google.com"]);
  });

  test("@で始まるドメインパターンを保持する", () => {
    const patterns = ["@example.com", "user@test.org", "@google.com"];
    const masked = maskEmailPatterns(patterns);

    expect(masked).toEqual(["@example.com", "u***@test.org", "@google.com"]);
  });

  test("混在したパターンを処理する", () => {
    const patterns = [
      "@company.com",
      "admin@test.org",
      "@university.edu",
      "john@example.com",
    ];
    const masked = maskEmailPatterns(patterns);

    expect(masked).toEqual([
      "@company.com",
      "a***@test.org",
      "@university.edu",
      "j***@example.com",
    ]);
  });

  test("空の配列を処理する", () => {
    expect(maskEmailPatterns([])).toEqual([]);
  });
});
