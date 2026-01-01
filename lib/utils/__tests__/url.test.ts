import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAbsoluteUrl, getBaseUrl } from "../url";

describe("getBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns NEXT_PUBLIC_SITE_URL when explicitly defined", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    expect(getBaseUrl()).toBe("https://example.com");
  });

  test("returns Vercel Branch URL in preview environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "my-branch-abc123.vercel.app");

    expect(getBaseUrl()).toBe("https://my-branch-abc123.vercel.app");
  });

  test("returns Vercel Branch URL using NEXT_PUBLIC_* variables in preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_BRANCH_URL", "my-branch-abc123.vercel.app");

    expect(getBaseUrl()).toBe("https://my-branch-abc123.vercel.app");
  });

  test("prioritizes NEXT_PUBLIC_VERCEL_BRANCH_URL over VERCEL_BRANCH_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv(
      "NEXT_PUBLIC_VERCEL_BRANCH_URL",
      "next-public-branch.vercel.app"
    );
    vi.stubEnv("VERCEL_BRANCH_URL", "old-branch.vercel.app");

    expect(getBaseUrl()).toBe("https://next-public-branch.vercel.app");
  });

  test("returns Vercel URL when Branch URL is not available in preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "my-preview-xyz789.vercel.app");

    expect(getBaseUrl()).toBe("https://my-preview-xyz789.vercel.app");
  });

  test("returns NEXT_PUBLIC_VERCEL_URL when Branch URL is not available in preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "my-preview-xyz789.vercel.app");

    expect(getBaseUrl()).toBe("https://my-preview-xyz789.vercel.app");
  });

  test("returns production URL in Vercel production environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "myapp.vercel.app");

    expect(getBaseUrl()).toBe("https://myapp.vercel.app");
  });

  test("returns production URL using NEXT_PUBLIC_* variable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "myapp.vercel.app");

    expect(getBaseUrl()).toBe("https://myapp.vercel.app");
  });

  test("prioritizes NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL over VERCEL_PROJECT_PRODUCTION_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
      "next-public-production.vercel.app"
    );
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "old-production.vercel.app");

    expect(getBaseUrl()).toBe("https://next-public-production.vercel.app");
  });

  test("returns localhost in local development", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("NODE_ENV", undefined);
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  test("NEXT_PUBLIC_SITE_URL takes precedence over Vercel variables", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://custom-domain.com");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_BRANCH_URL", "my-branch.vercel.app");

    expect(getBaseUrl()).toBe("https://custom-domain.com");
  });

  test("returns localhost when no Vercel URLs are available in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);

    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("getAbsoluteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(getAbsoluteUrl("/dashboard")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  test("preserves trailing slash in path", () => {
    expect(getAbsoluteUrl("/spaces/")).toBe("https://example.com/spaces/");
  });
});
