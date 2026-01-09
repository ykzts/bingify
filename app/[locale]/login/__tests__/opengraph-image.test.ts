import { describe, expect, test, vi } from "vitest";
import { alt, contentType, default as Image, size } from "../opengraph-image";

// Mock next-intl
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(({ locale }) => {
    return (key: string) => {
      if (locale === "ja") {
        if (key === "metaTitle") {
          return "ログイン";
        }
        if (key === "metaDescription") {
          return "Bingifyにログインして、ビンゴスペースの作成、イベントの主催、アカウントの管理を行いましょう。";
        }
      }
      if (key === "metaTitle") {
        return "Sign in";
      }
      if (key === "metaDescription") {
        return "Sign in to Bingify to create bingo spaces, host events, and manage your account.";
      }
      return "";
    };
  }),
}));

describe("Login OGP Image", () => {
  test("正しいサイズ定数をエクスポートする", () => {
    expect(size).toEqual({
      height: 630,
      width: 1200,
    });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("Bingify Login");
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
