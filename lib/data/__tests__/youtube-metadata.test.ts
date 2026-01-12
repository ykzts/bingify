import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, Tables } from "@/types/supabase";
// fetchYouTubeChannelDetails は private なので、モジュールから直接インポートできない
// そのため、fetchAndCacheYouTubeChannelMetadata を通じてテストする
import {
  fetchAndCacheYouTubeChannelMetadata,
  formatYouTubeChannelDisplay,
} from "../youtube-metadata";

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

// Supabaseクライアントのモック
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockUpsert = vi.fn();

  return {
    eq: mockEq,
    from: vi.fn(() => ({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      upsert: mockUpsert,
    })),
    select: mockSelect,
    single: mockSingle,
    upsert: mockUpsert,
  } as unknown as SupabaseClient<Database>;
};

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

describe("fetchAndCacheYouTubeChannelMetadata", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  it("APIから取得したcustomUrlの@プレフィックスを削除してhandleに保存する", async () => {
    // キャッシュなし（初回取得）のシナリオ
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    // YouTube API のレスポンス（customUrl に @ プレフィックスあり）
    mockChannelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "UC1234567890123456789012",
            snippet: {
              customUrl: "@testchannel", // @付きで返される
              description: "Test description",
              thumbnails: {
                default: {
                  url: "https://example.com/thumb.jpg",
                },
              },
              title: "Test Channel",
            },
          },
        ],
      },
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            channel_id: "UC1234567890123456789012",
            channel_title: "Test Channel",
            created_at: "2024-01-01T00:00:00Z",
            created_by: "user-123",
            custom_url: "@testchannel",
            description: "Test description",
            fetch_error: null,
            fetched_at: "2024-01-01T00:00:00Z",
            handle: "testchannel", // @なしで保存されることを期待
            id: "uuid-123",
            thumbnail_url: "https://example.com/thumb.jpg",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    });

    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "youtube_channels") {
        return {
          eq: mockEq,
          select: mockSelect,
          upsert: mockUpsert,
        };
      }
      return {
        eq: mockEq,
        select: mockSelect,
      };
    });

    const result = await fetchAndCacheYouTubeChannelMetadata(
      mockSupabase,
      "UC1234567890123456789012",
      "test_access_token",
      "user-123"
    );

    // YouTube API が呼ばれたことを確認
    expect(mockChannelsList).toHaveBeenCalledWith({
      id: ["UC1234567890123456789012"],
      part: ["snippet"],
    });

    // upsert が呼ばれたことを確認
    expect(mockUpsert).toHaveBeenCalled();

    // upsert に渡されたデータを確認
    const upsertCall = mockUpsert.mock.calls[0];
    const upsertedData = upsertCall[0];

    // handle フィールドが @ なしで保存されていることを確認
    expect(upsertedData.handle).toBe("testchannel");
    expect(upsertedData.handle).not.toContain("@");

    // custom_url は元のまま保存されている
    expect(upsertedData.custom_url).toBe("@testchannel");

    // 結果も handle が @ なしであることを確認
    expect(result.handle).toBe("testchannel");
  });

  it("customUrlが@で始まらない場合はそのまま保存する", async () => {
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    // YouTube API のレスポンス（customUrl に @ プレフィックスなし）
    mockChannelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "UC1234567890123456789012",
            snippet: {
              customUrl: "testchannel", // @なし
              title: "Test Channel",
            },
          },
        ],
      },
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            channel_id: "UC1234567890123456789012",
            channel_title: "Test Channel",
            created_at: "2024-01-01T00:00:00Z",
            created_by: null,
            custom_url: "testchannel",
            description: null,
            fetch_error: null,
            fetched_at: "2024-01-01T00:00:00Z",
            handle: "testchannel",
            id: "uuid-123",
            thumbnail_url: null,
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      }),
    });

    mockSupabase.from = vi.fn().mockImplementation(() => ({
      eq: mockEq,
      select: mockSelect,
      upsert: mockUpsert,
    }));

    const result = await fetchAndCacheYouTubeChannelMetadata(
      mockSupabase,
      "UC1234567890123456789012",
      "test_access_token"
    );

    const upsertCall = mockUpsert.mock.calls[0];
    const upsertedData = upsertCall[0];

    // @がない場合はそのまま保存される
    expect(upsertedData.handle).toBe("testchannel");
    expect(result.handle).toBe("testchannel");
  });

  it("customUrlがnullの場合はhandleもnullになる", async () => {
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    // YouTube API のレスポンス（customUrl なし）
    mockChannelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "UC1234567890123456789012",
            snippet: {
              customUrl: null, // customUrl なし
              title: "Test Channel",
            },
          },
        ],
      },
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            channel_id: "UC1234567890123456789012",
            channel_title: "Test Channel",
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
          },
          error: null,
        }),
      }),
    });

    mockSupabase.from = vi.fn().mockImplementation(() => ({
      eq: mockEq,
      select: mockSelect,
      upsert: mockUpsert,
    }));

    const result = await fetchAndCacheYouTubeChannelMetadata(
      mockSupabase,
      "UC1234567890123456789012",
      "test_access_token"
    );

    const upsertCall = mockUpsert.mock.calls[0];
    const upsertedData = upsertCall[0];

    // customUrl が null の場合は handle も null
    expect(upsertedData.handle).toBeNull();
    expect(result.handle).toBeNull();
  });
});
