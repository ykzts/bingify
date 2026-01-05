import { describe, expect, it } from "vitest";
import {
  extractLocaleFromPath,
  isAdminPath,
  isDashboardPath,
  isLoginPath,
} from "../path-matchers";

describe("path-matchers", () => {
  describe("isAdminPath", () => {
    it("/adminパスに対してtrueを返す", () => {
      expect(isAdminPath("/admin")).toBe(true);
    });

    it("/admin/パスに対してtrueを返す", () => {
      expect(isAdminPath("/admin/")).toBe(true);
    });

    it("ローカライズされた管理者パスに対してtrueを返す", () => {
      expect(isAdminPath("/en/admin")).toBe(true);
      expect(isAdminPath("/ja/admin")).toBe(true);
      expect(isAdminPath("/en/admin/")).toBe(true);
      expect(isAdminPath("/ja/admin/settings")).toBe(true);
    });

    it("管理者サブパスに対してtrueを返す", () => {
      expect(isAdminPath("/admin/users")).toBe(true);
      expect(isAdminPath("/admin/settings")).toBe(true);
    });

    it("管理者以外のパスに対してfalseを返す", () => {
      expect(isAdminPath("/dashboard")).toBe(false);
      expect(isAdminPath("/")).toBe(false);
      expect(isAdminPath("/en")).toBe(false);
      expect(isAdminPath("/administrator")).toBe(false);
    });
  });

  describe("isDashboardPath", () => {
    it("/dashboardパスに対してtrueを返す", () => {
      expect(isDashboardPath("/dashboard")).toBe(true);
    });

    it("/dashboard/パスに対してtrueを返す", () => {
      expect(isDashboardPath("/dashboard/")).toBe(true);
    });

    it("ローカライズされたダッシュボードパスに対してtrueを返す", () => {
      expect(isDashboardPath("/en/dashboard")).toBe(true);
      expect(isDashboardPath("/ja/dashboard")).toBe(true);
      expect(isDashboardPath("/en/dashboard/")).toBe(true);
      expect(isDashboardPath("/ja/dashboard/spaces")).toBe(true);
    });

    it("ダッシュボードサブパスに対してtrueを返す", () => {
      expect(isDashboardPath("/dashboard/spaces")).toBe(true);
      expect(isDashboardPath("/dashboard/spaces/123")).toBe(true);
    });

    it("ダッシュボード以外のパスに対してfalseを返す", () => {
      expect(isDashboardPath("/admin")).toBe(false);
      expect(isDashboardPath("/")).toBe(false);
      expect(isDashboardPath("/en")).toBe(false);
      expect(isDashboardPath("/dashboards")).toBe(false);
    });
  });

  describe("isLoginPath", () => {
    it("/loginパスに対してtrueを返す", () => {
      expect(isLoginPath("/login")).toBe(true);
    });

    it("ローカライズされたログインパスに対してtrueを返す", () => {
      expect(isLoginPath("/en/login")).toBe(true);
      expect(isLoginPath("/ja/login")).toBe(true);
    });

    it("ログイン以外のパスに対してfalseを返す", () => {
      expect(isLoginPath("/")).toBe(false);
      expect(isLoginPath("/dashboard")).toBe(false);
      expect(isLoginPath("/admin")).toBe(false);
      expect(isLoginPath("/en")).toBe(false);
      expect(isLoginPath("/ja")).toBe(false);
    });

    it("ログインサブパスに対してfalseを返す", () => {
      expect(isLoginPath("/login/")).toBe(false);
      expect(isLoginPath("/login/callback")).toBe(false);
      expect(isLoginPath("/en/login/")).toBe(false);
    });
  });

  describe("extractLocaleFromPath", () => {
    it("ローカライズされたパスからロケールを抽出する", () => {
      expect(extractLocaleFromPath("/en/dashboard")).toBe("en");
      expect(extractLocaleFromPath("/ja/admin")).toBe("ja");
      expect(extractLocaleFromPath("/en/spaces/123")).toBe("en");
    });

    it("ローカライズされていないパスに対してnullを返す", () => {
      expect(extractLocaleFromPath("/dashboard")).toBe(null);
      expect(extractLocaleFromPath("/admin")).toBe(null);
      expect(extractLocaleFromPath("/")).toBe(null);
    });

    it("無効なロケールプレフィックスに対してnullを返す", () => {
      expect(extractLocaleFromPath("/fr/dashboard")).toBe(null);
      expect(extractLocaleFromPath("/de/admin")).toBe(null);
    });
  });
});
