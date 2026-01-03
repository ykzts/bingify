import { describe, expect, test, vi } from "vitest";
import * as ogImage from "../opengraph-image";

// Mock next-intl
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ locale, namespace }) => {
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
  getSpacePublicInfo: vi.fn(async (id: string) => {
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
    expect(ogImage.size).toEqual({
      height: 630,
      width: 1200,
    });
    expect(ogImage.contentType).toBe("image/png");
    expect(ogImage.alt).toBe("Bingify Space");
  });

  test("should generate image with space data", async () => {
    const params = Promise.resolve({ id: "test-id", locale: "en" });
    const result = await ogImage.default({ params });

    // ImageResponse is a special Next.js type that we can't easily test,
    // but we can verify it's returned
    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });

  test("should handle different locales", async () => {
    const paramsEn = Promise.resolve({ id: "test-id", locale: "en" });
    const resultEn = await ogImage.default({ params: paramsEn });
    expect(resultEn).toBeDefined();

    const paramsJa = Promise.resolve({ id: "test-id", locale: "ja" });
    const resultJa = await ogImage.default({ params: paramsJa });
    expect(resultJa).toBeDefined();
  });

  test("should handle missing space data gracefully", async () => {
    const params = Promise.resolve({ id: "invalid-id", locale: "en" });
    const result = await ogImage.default({ params });

    // Should still generate an image even when space is not found
    expect(result).toBeDefined();
    expect(result.constructor.name).toBe("ImageResponse");
  });
});

