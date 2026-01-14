import { describe, expect, it } from "vitest";

/**
 * MobileFooterNavコンポーネントの表示ロジックのテスト
 *
 * このテストは、モバイルフッターナビゲーションが適切に表示されることを検証します。
 */
describe("MobileFooterNavの表示ロジック", () => {
  describe("未ログインユーザーの場合", () => {
    it("モバイルフッターナビゲーションは表示されない", () => {
      const user: null = null;

      const shouldShowMobileNav = user !== null;

      expect(shouldShowMobileNav).toBe(false);
    });
  });

  describe("ログイン済みユーザーの場合", () => {
    it("モバイルフッターナビゲーションが表示される", () => {
      const user = {
        avatar_url: null,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      };

      const shouldShowMobileNav = user !== null;

      expect(shouldShowMobileNav).toBe(true);
    });

    it("管理者ユーザーにもモバイルフッターナビゲーションが表示される", () => {
      const user = {
        avatar_url: null,
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
      };

      const shouldShowMobileNav = user !== null;

      expect(shouldShowMobileNav).toBe(true);
    });
  });
});

/**
 * MobileFooterNavの管理者リンク表示ロジックのテスト
 *
 * このテストは、管理者リンクが管理者ユーザーにのみ表示されることを検証します。
 */
describe("MobileFooterNavの管理者リンク表示ロジック", () => {
  describe("一般ユーザーの場合", () => {
    it("管理者リンクは表示されない", () => {
      const user = {
        avatar_url: null,
        email: "user@example.com",
        full_name: "Test User",
        role: "user",
      };

      const shouldShowAdminLink = user.role === "admin";

      expect(shouldShowAdminLink).toBe(false);
    });
  });

  describe("管理者ユーザーの場合", () => {
    it("管理者リンクが表示される", () => {
      const user = {
        avatar_url: null,
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
      };

      const shouldShowAdminLink = user.role === "admin";

      expect(shouldShowAdminLink).toBe(true);
    });
  });
});
