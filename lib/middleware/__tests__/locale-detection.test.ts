import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  detectLocaleFromRequest,
  isValidLocale,
  type Locale,
} from "../locale-detection";

describe("locale-detection", () => {
  describe("isValidLocale", () => {
    it("should return true for valid locales", () => {
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("ja")).toBe(true);
    });

    it("should return false for invalid locales", () => {
      expect(isValidLocale("fr")).toBe(false);
      expect(isValidLocale("de")).toBe(false);
      expect(isValidLocale("")).toBe(false);
    });

    it("should provide type guard for Locale type", () => {
      const locale: string = "en";
      if (isValidLocale(locale)) {
        const typedLocale: Locale = locale;
        expect(typedLocale).toBe("en");
      }
    });
  });

  describe("detectLocaleFromRequest", () => {
    it("should detect locale from NEXT_LOCALE cookie", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "NEXT_LOCALE=ja",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("should detect locale from Accept-Language header", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja,en-US;q=0.9,en;q=0.8",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("should prefer cookie over Accept-Language header", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "NEXT_LOCALE=en",
          "accept-language": "ja,en-US;q=0.9",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("should handle Accept-Language with region codes", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja-JP,en-US;q=0.9,en;q=0.8",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("should return default locale when no valid locale found", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "fr,de;q=0.9",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("should return default locale when no headers present", () => {
      const request = new NextRequest("http://localhost:3000/@test");

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("should handle invalid cookie values gracefully", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "NEXT_LOCALE=invalid",
          "accept-language": "ja",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("should handle multiple cookies correctly", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "OTHER_COOKIE=value; NEXT_LOCALE=ja; ANOTHER=test",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });
  });
});
