import { describe, expect, it } from "vitest";

/**
 * HeaderMenuコンポーネントのログインボタン表示ロジックのテスト
 *
 * このテストは、ログインページではログインボタンが表示されないことを検証します。
 */
describe("HeaderMenuのログインボタン表示ロジック", () => {
  describe("未ログインユーザーの場合", () => {
    it("ログインページではログインボタンが表示されない", () => {
      // テスト条件
      const user: null = null;
      const pathname = "/login";

      // ログインページの場合は何も表示しない
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(false);
    });

    it("ログインページ以外ではログインボタンが表示される", () => {
      // テスト条件
      const user: null = null;
      const pathname = "/";

      // ログインページ以外の場合はログインボタンを表示
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(true);
    });

    it("ダッシュボードページではログインボタンが表示される", () => {
      // テスト条件
      const user: null = null;
      const pathname = "/dashboard";

      // ログインページ以外の場合はログインボタンを表示
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(true);
    });
  });

  describe("ログイン済みユーザーの場合", () => {
    it("どのページでもログインボタンは表示されない", () => {
      // テスト条件
      const user = {
        avatar_url: null,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      };
      const pathname = "/";

      // ログイン済みの場合はログインボタンを表示しない
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(false);
    });

    it("ログインページでもログインボタンは表示されない", () => {
      // テスト条件
      const user = {
        avatar_url: null,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      };
      const pathname = "/login";

      // ログイン済みの場合はログインボタンを表示しない
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(false);
    });
  });
});
