import { describe, expect, test } from "vitest";
import { maskEmail, maskEmailPatterns } from "../privacy";

describe("maskEmail", () => {
  test("masks email addresses correctly", () => {
    expect(maskEmail("user@example.com")).toBe("u***@example.com");
    expect(maskEmail("test@google.com")).toBe("t***@google.com");
    expect(maskEmail("a@test.org")).toBe("a***@test.org");
    expect(maskEmail("john.doe@company.co.jp")).toBe("j***@company.co.jp");
  });

  test("handles edge cases", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail("invalid")).toBe("invalid");
    expect(maskEmail("@example.com")).toBe("***@example.com");
  });

  test("preserves domain part", () => {
    const masked = maskEmail("user@example.com");
    expect(masked).toContain("@example.com");
    expect(masked.split("@")[1]).toBe("example.com");
  });
});

describe("maskEmailPatterns", () => {
  test("masks email addresses in array", () => {
    const patterns = ["user@example.com", "test@google.com"];
    const masked = maskEmailPatterns(patterns);

    expect(masked).toEqual(["u***@example.com", "t***@google.com"]);
  });

  test("preserves domain patterns starting with @", () => {
    const patterns = ["@example.com", "user@test.org", "@google.com"];
    const masked = maskEmailPatterns(patterns);

    expect(masked).toEqual(["@example.com", "u***@test.org", "@google.com"]);
  });

  test("handles mixed patterns", () => {
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

  test("handles empty array", () => {
    expect(maskEmailPatterns([])).toEqual([]);
  });
});
