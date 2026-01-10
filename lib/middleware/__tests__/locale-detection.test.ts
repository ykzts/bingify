import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  detectLocaleFromRequest,
  isValidLocale,
  type Locale,
} from "../locale-detection";

describe("locale-detection", () => {
  describe("isValidLocale", () => {
    it("有効なロケールに対してtrueを返す", () => {
      expect(isValidLocale("en")).toBe(true);
      expect(isValidLocale("ja")).toBe(true);
    });

    it("無効なロケールに対してfalseを返す", () => {
      expect(isValidLocale("fr")).toBe(false);
      expect(isValidLocale("de")).toBe(false);
      expect(isValidLocale("")).toBe(false);
    });

    it("Locale型の型ガードを提供する", () => {
      const locale: string = "en";
      if (isValidLocale(locale)) {
        const typedLocale: Locale = locale;
        expect(typedLocale).toBe("en");
      }
    });
  });

  describe("detectLocaleFromRequest", () => {
    it("NEXT_LOCALEクッキーからロケールを検出する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "NEXT_LOCALE=ja",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("Accept-Languageヘッダーからロケールを検出する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja,en-US;q=0.9,en;q=0.8",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("Accept-Languageヘッダーよりクッキーを優先する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja,en-US;q=0.9",
          cookie: "NEXT_LOCALE=en",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("地域コード付きのAccept-Languageを処理する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja-JP,en-US;q=0.9,en;q=0.8",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("有効なロケールが見つからない場合デフォルトロケールを返す", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "fr,de;q=0.9",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("ヘッダーが存在しない場合デフォルトロケールを返す", () => {
      const request = new NextRequest("http://localhost:3000/@test");

      expect(detectLocaleFromRequest(request)).toBe("en");
    });

    it("無効なクッキー値を適切に処理する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          "accept-language": "ja",
          cookie: "NEXT_LOCALE=invalid",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });

    it("複数のクッキーを正しく処理する", () => {
      const request = new NextRequest("http://localhost:3000/@test", {
        headers: {
          cookie: "OTHER_COOKIE=value; NEXT_LOCALE=ja; ANOTHER=test",
        },
      });

      expect(detectLocaleFromRequest(request)).toBe("ja");
    });
  });
});
