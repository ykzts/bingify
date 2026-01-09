import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAuthCallbackUrl } from "../callback-url";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

describe("buildAuthCallbackUrl", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  });

  it("リダイレクトなしでコールバックURLを返す", () => {
    const url = buildAuthCallbackUrl();
    expect(url).toBe("https://example.com/auth/callback");
  });

  it("先頭スラッシュの相対パスを安全に付与する", () => {
    const url = buildAuthCallbackUrl("/dashboard/spaces");
    expect(url).toBe(
      "https://example.com/auth/callback?redirect=%2Fdashboard%2Fspaces"
    );
  });

  it("スキーマ付きURLは無視してredirectを付与しない", () => {
    const url = buildAuthCallbackUrl("https://evil.com/hijack");
    expect(url).toBe("https://example.com/auth/callback");
  });

  it("プロトコル相対URLは無視してredirectを付与しない", () => {
    const url = buildAuthCallbackUrl("//evil.com/hijack");
    expect(url).toBe("https://example.com/auth/callback");
  });

  it("先頭スラッシュが無い場合は無視する", () => {
    const url = buildAuthCallbackUrl("dashboard/spaces");
    expect(url).toBe("https://example.com/auth/callback");
  });

  it("クエリやハッシュを含むパスもエンコードして付与する", () => {
    const url = buildAuthCallbackUrl("/spaces/123?foo=1#section");
    expect(url).toBe(
      "https://example.com/auth/callback?redirect=%2Fspaces%2F123%3Ffoo%3D1%23section"
    );
  });
});
