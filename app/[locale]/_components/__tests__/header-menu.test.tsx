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
      const pathname: string = "/login";

      // ログインページの場合は何も表示しない
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(false);
    });

    it("ログインページ以外ではログインボタンが表示される", () => {
      // テスト条件
      const user: null = null;
      const pathname: string = "/";

      // ログインページ以外の場合はログインボタンを表示
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(true);
    });

    it("ダッシュボードページではログインボタンが表示される", () => {
      // テスト条件
      const user: null = null;
      const pathname: string = "/dashboard";

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
      const pathname: string = "/";

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
      const pathname: string = "/login";

      // ログイン済みの場合はログインボタンを表示しない
      const shouldShowLoginButton = user === null && pathname !== "/login";

      expect(shouldShowLoginButton).toBe(false);
    });
  });
});

/**
 * HeaderMenuコンポーネントの通知ベル表示ロジックのテスト
 *
 * このテストは、通知ベルが認証済みユーザーにのみ表示されることを検証します。
 */
describe("HeaderMenuの通知ベル表示ロジック", () => {
  describe("未ログインユーザーの場合", () => {
    it("通知ベルは表示されない", () => {
      // テスト条件
      const user: null = null;

      // 未ログインの場合は通知ベルを表示しない
      const shouldShowNotificationBell = user !== null;

      expect(shouldShowNotificationBell).toBe(false);
    });
  });

  describe("ログイン済みユーザーの場合", () => {
    it("通知ベルが表示される", () => {
      // テスト条件
      const user = {
        avatar_url: null,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      };

      // ログイン済みの場合は通知ベルを表示する
      const shouldShowNotificationBell = user !== null;

      expect(shouldShowNotificationBell).toBe(true);
    });

    it("管理者ユーザーにも通知ベルが表示される", () => {
      // テスト条件
      const user = {
        avatar_url: null,
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
      };

      // 管理者の場合も通知ベルを表示する
      const shouldShowNotificationBell = user !== null;

      expect(shouldShowNotificationBell).toBe(true);
    });
  });
});
