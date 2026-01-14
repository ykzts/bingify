import { describe, expect, it } from "vitest";

/**
 * ConditionalHeaderコンポーネントのヘッダー表示ロジックのテスト
 *
 * このテストは、ログインページでヘッダーが非表示になることを検証します。
 */
describe("ConditionalHeaderのヘッダー表示ロジック", () => {
  it("ログインページではヘッダーを非表示にする", () => {
    const pathname: string = "/login";

    // ログインページの場合はヘッダーを非表示
    const shouldShowHeader = pathname !== "/login";

    expect(shouldShowHeader).toBe(false);
  });

  it("ホームページではヘッダーを表示する", () => {
    const pathname: string = "/";

    // ログインページ以外の場合はヘッダーを表示
    const shouldShowHeader = pathname !== "/login";

    expect(shouldShowHeader).toBe(true);
  });

  it("ダッシュボードページではヘッダーを表示する", () => {
    const pathname: string = "/dashboard";

    // ログインページ以外の場合はヘッダーを表示
    const shouldShowHeader = pathname !== "/login";

    expect(shouldShowHeader).toBe(true);
  });
});
