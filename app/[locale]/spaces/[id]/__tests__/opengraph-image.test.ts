import { describe, expect, test, vi } from "vitest";
import { alt, contentType, default as Image, size } from "../opengraph-image";

// Mock next-intl
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(({ locale }) => {
    return (key: string) => {
      if (locale === "ja" && key === "ogSpaceSubtitle") {
        return "このビンゴスペースに参加";
      }
      return "Join this bingo space";
    };
  }),
}));

// Mock the actions module
vi.mock("../_lib/actions", () => ({
  getSpacePublicInfo: vi.fn((id: string) => {
    if (id === "invalid-id") {
      return null;
    }
    return {
      description: "Test space description",
      gatekeeper_rules: null,
      hideMetadata: false,
      id,
      share_key: "TEST123",
      status: "active",
      title: "Test Space",
    };
  }),
}));

describe("Space OGP Image", () => {
  test("should export correct size constants", () => {
    expect(size).toEqual({
      height: 630,
      width: 1200,
    });
    expect(contentType).toBe("image/png");
    expect(alt).toBe("Bingify Space");
  });

  test("should generate image with space data", async () => {
    const params = Promise.resolve({ id: "test-id", locale: "en" });
    const result = await Image({ params });

    // ImageResponse is a special Next.js type that we can't easily test,
    // but we can verify it's returned
    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });

  test("should handle different locales", async () => {
    const paramsEn = Promise.resolve({ id: "test-id", locale: "en" });
    const resultEn = await Image({ params: paramsEn });
    expect(resultEn).toBeDefined();

    const paramsJa = Promise.resolve({ id: "test-id", locale: "ja" });
    const resultJa = await Image({ params: paramsJa });
    expect(resultJa).toBeDefined();
  });

  test("should handle missing space data gracefully", async () => {
    const params = Promise.resolve({ id: "invalid-id", locale: "en" });
    const result = await Image({ params });

    // Should still generate an image even when space is not found
    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });
});
