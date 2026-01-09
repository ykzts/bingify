import { describe, expect, test, vi } from "vitest";
import { alt, contentType, default as Image, size } from "../opengraph-image";

// Mock next-intl
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(({ locale }) => {
    return (key: string) => {
      if (locale === "ja") {
        if (key === "metaTitle") {
          return "プライバシーポリシー";
        }
        if (key === "metaDescription") {
          return "Bingifyのプライバシーポリシーをご覧ください。個人情報の収集、利用、保護の方法について説明しています。";
        }
      }
      if (key === "metaTitle") {
        return "Privacy Policy";
      }
      if (key === "metaDescription") {
        return "Read Bingify's Privacy Policy to understand how we collect, use, and protect your personal information.";
      }
      return "";
    };
  }),
}));

describe("Privacy OGP Image", () => {
  test("正しいサイズ定数をエクスポートする", () => {
    expect(size).toEqual({
      height: 630,
      width: 1200,
    });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("Bingify Privacy Policy");
  });

  test("英語ロケールで画像を生成する", async () => {
    const params = Promise.resolve({ locale: "en" });
    const result = await Image({ params });

    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });

  test("日本語ロケールで画像を生成する", async () => {
    const params = Promise.resolve({ locale: "ja" });
    const result = await Image({ params });

    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });
});
