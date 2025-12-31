import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getAbsoluteUrl, getBaseUrl } from "../url";

describe("getBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to original state before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after tests
    process.env = originalEnv;
  });

  test("returns NEXT_PUBLIC_APP_URL when explicitly defined", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    expect(getBaseUrl()).toBe("https://example.com");
  });

  test("returns Vercel Branch URL in preview environment", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "my-branch-abc123.vercel.app";

    expect(getBaseUrl()).toBe("https://my-branch-abc123.vercel.app");
  });

  test("returns Vercel URL when Branch URL is not available in preview", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "my-preview-xyz789.vercel.app";

    expect(getBaseUrl()).toBe("https://my-preview-xyz789.vercel.app");
  });

  test("returns production URL in Vercel production environment", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "myapp.vercel.app";

    expect(getBaseUrl()).toBe("https://myapp.vercel.app");
  });

  test("returns localhost in local development", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NODE_ENV;
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  test("NEXT_PUBLIC_APP_URL takes precedence over Vercel variables", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-domain.com";
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "my-branch.vercel.app";

    expect(getBaseUrl()).toBe("https://custom-domain.com");
  });

  test("returns localhost when no Vercel URLs are available in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("getAbsoluteUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to original state before each test
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  afterEach(() => {
    // Restore original env after tests
    process.env = originalEnv;
  });

  test("returns base URL when no path is provided", () => {
    expect(getAbsoluteUrl()).toBe("https://example.com/");
  });

  test("returns base URL when empty string path is provided", () => {
    expect(getAbsoluteUrl("")).toBe("https://example.com/");
  });

  test("correctly joins base URL with path", () => {
    expect(getAbsoluteUrl("/spaces/123")).toBe(
      "https://example.com/spaces/123"
    );
  });

  test("correctly joins base URL with path without leading slash", () => {
    expect(getAbsoluteUrl("spaces/123")).toBe("https://example.com/spaces/123");
  });

  test("correctly joins base URL with path containing query params", () => {
    expect(getAbsoluteUrl("/search?q=test")).toBe(
      "https://example.com/search?q=test"
    );
  });

  test("handles path with hash", () => {
    expect(getAbsoluteUrl("/page#section")).toBe(
      "https://example.com/page#section"
    );
  });

  test("handles protocol-relative URLs correctly", () => {
    // When path starts with //, new URL treats it as protocol-relative
    // This is expected behavior
    expect(getAbsoluteUrl("//spaces//123")).toBe("https://spaces//123");
  });

  test("handles complex paths", () => {
    expect(getAbsoluteUrl("/api/v1/users/123/posts?sort=desc&limit=10")).toBe(
      "https://example.com/api/v1/users/123/posts?sort=desc&limit=10"
    );
  });

  test("handles relative paths correctly", () => {
    expect(getAbsoluteUrl("../relative/path")).toBe(
      "https://example.com/relative/path"
    );
  });

  test("handles special characters in path", () => {
    // new URL() is quite permissive with special characters in paths
    // It only throws on truly invalid URLs like missing protocol
    expect(getAbsoluteUrl("/path/with!special@chars")).toBe(
      "https://example.com/path/with!special@chars"
    );
  });

  test("works with different base URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getAbsoluteUrl("/dashboard")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  test("preserves trailing slash in path", () => {
    expect(getAbsoluteUrl("/spaces/")).toBe("https://example.com/spaces/");
  });
});
