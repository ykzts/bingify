import { describe, expect, it } from "vitest";
import {
  extractLocaleFromPath,
  isAdminPath,
  isDashboardPath,
  isLoginPath,
} from "../path-matchers";

describe("path-matchers", () => {
  describe("isAdminPath", () => {
    it("should return true for /admin path", () => {
      expect(isAdminPath("/admin")).toBe(true);
    });

    it("should return true for /admin/ path", () => {
      expect(isAdminPath("/admin/")).toBe(true);
    });

    it("should return true for localized admin paths", () => {
      expect(isAdminPath("/en/admin")).toBe(true);
      expect(isAdminPath("/ja/admin")).toBe(true);
      expect(isAdminPath("/en/admin/")).toBe(true);
      expect(isAdminPath("/ja/admin/settings")).toBe(true);
    });

    it("should return true for admin subpaths", () => {
      expect(isAdminPath("/admin/users")).toBe(true);
      expect(isAdminPath("/admin/settings")).toBe(true);
    });

    it("should return false for non-admin paths", () => {
      expect(isAdminPath("/dashboard")).toBe(false);
      expect(isAdminPath("/")).toBe(false);
      expect(isAdminPath("/en")).toBe(false);
      expect(isAdminPath("/administrator")).toBe(false);
    });
  });

  describe("isDashboardPath", () => {
    it("should return true for /dashboard path", () => {
      expect(isDashboardPath("/dashboard")).toBe(true);
    });

    it("should return true for /dashboard/ path", () => {
      expect(isDashboardPath("/dashboard/")).toBe(true);
    });

    it("should return true for localized dashboard paths", () => {
      expect(isDashboardPath("/en/dashboard")).toBe(true);
      expect(isDashboardPath("/ja/dashboard")).toBe(true);
      expect(isDashboardPath("/en/dashboard/")).toBe(true);
      expect(isDashboardPath("/ja/dashboard/spaces")).toBe(true);
    });

    it("should return true for dashboard subpaths", () => {
      expect(isDashboardPath("/dashboard/spaces")).toBe(true);
      expect(isDashboardPath("/dashboard/spaces/123")).toBe(true);
    });

    it("should return false for non-dashboard paths", () => {
      expect(isDashboardPath("/admin")).toBe(false);
      expect(isDashboardPath("/")).toBe(false);
      expect(isDashboardPath("/en")).toBe(false);
      expect(isDashboardPath("/dashboards")).toBe(false);
    });
  });

  describe("isLoginPath", () => {
    it("should return true for /login path", () => {
      expect(isLoginPath("/login")).toBe(true);
    });

    it("should return true for localized login paths", () => {
      expect(isLoginPath("/en/login")).toBe(true);
      expect(isLoginPath("/ja/login")).toBe(true);
    });

    it("should return false for non-login paths", () => {
      expect(isLoginPath("/")).toBe(false);
      expect(isLoginPath("/dashboard")).toBe(false);
      expect(isLoginPath("/admin")).toBe(false);
      expect(isLoginPath("/en")).toBe(false);
      expect(isLoginPath("/ja")).toBe(false);
    });

    it("should return false for login subpaths", () => {
      expect(isLoginPath("/login/")).toBe(false);
      expect(isLoginPath("/login/callback")).toBe(false);
      expect(isLoginPath("/en/login/")).toBe(false);
    });
  });

  describe("extractLocaleFromPath", () => {
    it("should extract locale from localized paths", () => {
      expect(extractLocaleFromPath("/en/dashboard")).toBe("en");
      expect(extractLocaleFromPath("/ja/admin")).toBe("ja");
      expect(extractLocaleFromPath("/en/spaces/123")).toBe("en");
    });

    it("should return null for non-localized paths", () => {
      expect(extractLocaleFromPath("/dashboard")).toBe(null);
      expect(extractLocaleFromPath("/admin")).toBe(null);
      expect(extractLocaleFromPath("/")).toBe(null);
    });

    it("should return null for invalid locale prefixes", () => {
      expect(extractLocaleFromPath("/fr/dashboard")).toBe(null);
      expect(extractLocaleFromPath("/de/admin")).toBe(null);
    });
  });
});
