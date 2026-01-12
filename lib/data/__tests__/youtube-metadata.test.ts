import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/types/supabase";
import { formatYouTubeChannelDisplay } from "../youtube-metadata";

// YouTube API のモック
const mockChannelsList = vi.fn();

vi.mock("@googleapis/youtube", () => ({
  youtube_v3: {
    Youtube: class {
      channels = {
        list: mockChannelsList,
      };
    },
  },
}));

vi.mock("@/lib/oauth/create-oauth-client", () => ({
  createOAuth2ClientFromToken: vi.fn(() => ({})),
}));

describe("formatYouTubeChannelDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ハンドルがある場合は@付きで表示する", () => {
    const metadata: Tables<"youtube_channels"> = {
      channel_id: "UC1234567890123456789012",
      channel_title: "Test Channel",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      custom_url: "@testchannel",
      description: "Test description",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      handle: "testchannel", // @なしで保存されている
      id: "uuid-123",
      thumbnail_url: "https://example.com/thumb.jpg",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = formatYouTubeChannelDisplay(metadata);

    // ハンドルには@が付与されて表示される
    expect(result).toBe("@testchannel (UC1234567890123456789012)");
  });

  it("ハンドルがない場合はタイトルとチャンネルIDを表示する", () => {
    const metadata: Tables<"youtube_channels"> = {
      channel_id: "UC1234567890123456789012",
      channel_title: "Test Channel",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      custom_url: null,
      description: "Test description",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      handle: null,
      id: "uuid-123",
      thumbnail_url: "https://example.com/thumb.jpg",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = formatYouTubeChannelDisplay(metadata);

    expect(result).toBe("Test Channel (UC1234567890123456789012)");
  });

  it("ハンドルもタイトルもない場合はチャンネルIDのみ表示する", () => {
    const metadata: Tables<"youtube_channels"> = {
      channel_id: "UC1234567890123456789012",
      channel_title: null,
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      custom_url: null,
      description: null,
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      handle: null,
      id: "uuid-123",
      thumbnail_url: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = formatYouTubeChannelDisplay(metadata);

    expect(result).toBe("UC1234567890123456789012");
  });

  it("空文字列のハンドルの場合はタイトルとチャンネルIDを表示する", () => {
    const metadata: Tables<"youtube_channels"> = {
      channel_id: "UC1234567890123456789012",
      channel_title: "Test Channel",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      custom_url: null,
      description: null,
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      handle: "", // 空文字列
      id: "uuid-123",
      thumbnail_url: null,
      updated_at: "2024-01-01T00:00:00Z",
    };

    const result = formatYouTubeChannelDisplay(metadata);

    // 空文字列はfalsyなので、タイトルが使用される
    expect(result).toBe("Test Channel (UC1234567890123456789012)");
  });
});
