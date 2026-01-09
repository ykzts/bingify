import { describe, expect, test, vi } from "vitest";
import { alt, contentType, default as Image, size } from "../opengraph-image";

// MDXコンテンツのロードをモック
vi.mock("@/lib/components/mdx-content", () => ({
  loadMDXContent: vi.fn((locale: string) => {
    if (locale === "ja") {
      return Promise.resolve({
        default: () => null,
        metadata: {
          title: "利用規約",
        },
      });
    }
    return Promise.resolve({
      default: () => null,
      metadata: {
        title: "Terms of Service",
      },
    });
  }),
}));

describe("利用規約のOGP画像", () => {
  test("正しいサイズ定数をエクスポートする", () => {
    expect(size).toEqual({
      height: 630,
      width: 1200,
    });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("Bingify Terms of Service");
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

  test("MDXの読み込みエラー時にデフォルトタイトルを使用する", async () => {
    // loadMDXContentがエラーを投げるように一時的に変更
    const { loadMDXContent } = await import("@/lib/components/mdx-content");
    vi.mocked(loadMDXContent).mockRejectedValueOnce(
      new Error("Failed to load")
    );

    const params = Promise.resolve({ locale: "en" });
    const result = await Image({ params });

    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });

  test("メタデータが'Content Not Found'の場合にデフォルトタイトルを使用する", async () => {
    const { loadMDXContent } = await import("@/lib/components/mdx-content");
    vi.mocked(loadMDXContent).mockResolvedValueOnce({
      default: () => null,
      metadata: {
        title: "Content Not Found",
      },
    });

    const params = Promise.resolve({ locale: "ja" });
    const result = await Image({ params });

    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });
});
