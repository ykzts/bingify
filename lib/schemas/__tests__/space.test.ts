import { describe, expect, it } from "vitest";
import {
  checkEmailAllowed,
  emailAllowlistSchema,
  parseEmailAllowlist,
} from "../space";

describe("parseEmailAllowlist", () => {
  it("should parse comma-separated patterns", () => {
    const result = parseEmailAllowlist(
      "@example.com, @test.org, user@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should parse newline-separated patterns", () => {
    const result = parseEmailAllowlist(
      "@example.com\n@test.org\nuser@mail.com"
    );
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should parse mixed separators", () => {
    const result = parseEmailAllowlist("@example.com,@test.org\nuser@mail.com");
    expect(result).toEqual(["@example.com", "@test.org", "user@mail.com"]);
  });

  it("should normalize domain without @ to @domain", () => {
    const result = parseEmailAllowlist("example.com, test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });

  it("should keep @ prefixed domains as is", () => {
    const result = parseEmailAllowlist("@example.com");
    expect(result).toEqual(["@example.com"]);
  });

  it("should keep full email addresses as is", () => {
    const result = parseEmailAllowlist("user@example.com");
    expect(result).toEqual(["user@example.com"]);
  });

  it("should return empty array for empty input", () => {
    const result = parseEmailAllowlist("");
    expect(result).toEqual([]);
  });

  it("should return empty array for whitespace only input", () => {
    const result = parseEmailAllowlist("   ");
    expect(result).toEqual([]);
  });

  it("should trim whitespace from patterns", () => {
    const result = parseEmailAllowlist("  @example.com  ,  user@test.com  ");
    expect(result).toEqual(["@example.com", "user@test.com"]);
  });

  it("should filter out empty patterns", () => {
    const result = parseEmailAllowlist("@example.com,,@test.org");
    expect(result).toEqual(["@example.com", "@test.org"]);
  });
});

describe("emailAllowlistSchema", () => {
  it("should accept valid domain patterns with @", () => {
    const result = emailAllowlistSchema.safeParse("@example.com, @test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("should accept valid domain patterns without @", () => {
    const result = emailAllowlistSchema.safeParse("example.com, test.org");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["@example.com", "@test.org"]);
    }
  });

  it("should accept valid full email addresses", () => {
    const result = emailAllowlistSchema.safeParse(
      "user@example.com, admin@test.org"
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["user@example.com", "admin@test.org"]);
    }
  });

  it("should accept mixed patterns", () => {
    const result = emailAllowlistSchema.safeParse(
      "@example.com, user@test.org, another.com"
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        "@example.com",
        "user@test.org",
        "@another.com",
      ]);
    }
  });

  it("should accept empty string", () => {
    const result = emailAllowlistSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should accept undefined", () => {
    const result = emailAllowlistSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("should reject invalid patterns without dot", () => {
    const result = emailAllowlistSchema.safeParse("@example");
    expect(result.success).toBe(false);
  });

  it("should reject patterns with only @", () => {
    const result = emailAllowlistSchema.safeParse("@");
    expect(result.success).toBe(false);
  });

  it("should reject invalid email format", () => {
    const result = emailAllowlistSchema.safeParse("invalid@");
    expect(result.success).toBe(false);
  });
});

describe("checkEmailAllowed", () => {
  it("should allow any email when allowlist is empty", () => {
    expect(checkEmailAllowed("user@example.com", [])).toBe(true);
    expect(checkEmailAllowed("admin@test.org", [])).toBe(true);
  });

  it("should match domain pattern with @", () => {
    expect(checkEmailAllowed("user@example.com", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("admin@example.com", ["@example.com"])).toBe(true);
  });

  it("should not match different domain", () => {
    expect(checkEmailAllowed("user@test.org", ["@example.com"])).toBe(false);
  });

  it("should match full email address", () => {
    expect(checkEmailAllowed("user@example.com", ["user@example.com"])).toBe(
      true
    );
  });

  it("should not match different email address", () => {
    expect(checkEmailAllowed("admin@example.com", ["user@example.com"])).toBe(
      false
    );
  });

  it("should match against multiple patterns", () => {
    const patterns = ["@example.com", "admin@test.org", "@another.org"];
    expect(checkEmailAllowed("user@example.com", patterns)).toBe(true);
    expect(checkEmailAllowed("admin@test.org", patterns)).toBe(true);
    expect(checkEmailAllowed("user@another.org", patterns)).toBe(true);
  });

  it("should not match if no patterns match", () => {
    const patterns = ["@example.com", "admin@test.org"];
    expect(checkEmailAllowed("user@different.com", patterns)).toBe(false);
  });

  it("should be case insensitive for domain matching", () => {
    expect(checkEmailAllowed("User@Example.COM", ["@example.com"])).toBe(true);
    expect(checkEmailAllowed("user@example.com", ["@Example.COM"])).toBe(true);
  });

  it("should be case insensitive for email matching", () => {
    expect(checkEmailAllowed("User@Example.COM", ["user@example.com"])).toBe(
      true
    );
    expect(checkEmailAllowed("user@example.com", ["User@Example.COM"])).toBe(
      true
    );
  });

  it("should not match subdomain with parent domain pattern", () => {
    // Domain matching is exact suffix, so sub.example.com doesn't match @example.com
    expect(checkEmailAllowed("user@sub.example.com", ["@example.com"])).toBe(
      false
    );
  });

  it("should not match partial domain", () => {
    // Should not match "test@notexample.com" with "@example.com"
    expect(checkEmailAllowed("test@notexample.com", ["@example.com"])).toBe(
      false
    );
  });
});
