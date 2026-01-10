import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, Tables, TablesInsert } from "@/types/supabase";
import {
  fetchAndCacheTwitchBroadcasterMetadata,
  formatTwitchBroadcasterDisplay,
  getTwitchBroadcasterMetadata,
  upsertTwitchBroadcasterMetadata,
} from "../twitch-metadata";

// Twurple のモック
const mockGetUsersByIds = vi.fn();

vi.mock("@twurple/api", () => ({
  ApiClient: class {
    users = {
      getUsersByIds: mockGetUsersByIds,
    };
  },
}));

vi.mock("@twurple/auth", () => ({
  StaticAuthProvider: class {},
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

describe("getTwitchBroadcasterMetadata", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  it("データベースから配信者メタデータを取得する", async () => {
    const mockData: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: "user-123",
      description: "テスト配信者",
      display_name: "TestStreamer",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      id: "uuid-123",
      profile_image_url: "https://example.com/avatar.jpg",
      updated_at: "2024-01-01T00:00:00Z",
      username: "teststreamer",
    };

    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    const result = await getTwitchBroadcasterMetadata(
      mockSupabase,
      "123456789"
    );

    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith("twitch_broadcasters");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("broadcaster_id", "123456789");
  });

  it("データが見つからない場合はnullを返す", async () => {
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    const result = await getTwitchBroadcasterMetadata(
      mockSupabase,
      "nonexistent"
    );

    expect(result).toBeNull();
  });
});

describe("upsertTwitchBroadcasterMetadata", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  it("メタデータをデータベースに保存する", async () => {
    const inputMetadata: TablesInsert<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      description: "テスト配信者",
      display_name: "TestStreamer",
      fetched_at: "2024-01-01T00:00:00Z",
      profile_image_url: "https://example.com/avatar.jpg",
      username: "teststreamer",
    };

    const mockData: Tables<"twitch_broadcasters"> = {
      ...inputMetadata,
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: "テスト配信者",
      display_name: "TestStreamer",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      id: "uuid-123",
      profile_image_url: "https://example.com/avatar.jpg",
      updated_at: "2024-01-01T00:00:00Z",
      username: "teststreamer",
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: mockData,
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      upsert: mockUpsert,
    });

    const result = await upsertTwitchBroadcasterMetadata(
      mockSupabase,
      inputMetadata
    );

    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith("twitch_broadcasters");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("エラーが発生した場合は例外をスローする", async () => {
    const inputMetadata: TablesInsert<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      fetched_at: "2024-01-01T00:00:00Z",
    };

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const mockSelect = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      upsert: mockUpsert,
    });

    await expect(
      upsertTwitchBroadcasterMetadata(mockSupabase, inputMetadata)
    ).rejects.toThrow("Failed to upsert Twitch broadcaster metadata");
  });
});

describe("fetchAndCacheTwitchBroadcasterMetadata", () => {
  let mockSupabase: SupabaseClient<Database>;
  const originalEnv = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "test_client_id";
  });

  afterEach(() => {
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = originalEnv;
  });

  it("キャッシュが新しい場合はDBから返す", async () => {
    const cachedData: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: "キャッシュされた配信者",
      display_name: "CachedStreamer",
      fetch_error: null,
      fetched_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1時間前
      id: "uuid-123",
      profile_image_url: "https://example.com/cached.jpg",
      updated_at: "2024-01-01T00:00:00Z",
      username: "cachedstreamer",
    };

    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: cachedData,
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    const result = await fetchAndCacheTwitchBroadcasterMetadata(
      mockSupabase,
      "123456789",
      "app_access_token"
    );

    expect(result).toEqual(cachedData);
    // APIは呼ばれない
    expect(mockGetUsersByIds).not.toHaveBeenCalled();
  });

  it("キャッシュが古い場合はAPIから取得して保存する", async () => {
    const oldCachedData: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: null,
      display_name: null,
      fetch_error: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25時間前（期限切れ）
      id: "uuid-123",
      profile_image_url: null,
      updated_at: "2024-01-01T00:00:00Z",
      username: null,
    };

    const apiResponse = {
      description: "新しい説明",
      displayName: "NewStreamer",
      id: "123456789",
      name: "newstreamer",
      profilePictureUrl: "https://example.com/new.jpg",
    };

    const newData: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-02T00:00:00Z",
      created_by: null,
      description: "新しい説明",
      display_name: "NewStreamer",
      fetch_error: null,
      fetched_at: "2024-01-02T00:00:00Z",
      id: "uuid-123",
      profile_image_url: "https://example.com/new.jpg",
      updated_at: "2024-01-02T00:00:00Z",
      username: "newstreamer",
    };

    // getTwitchBroadcasterMetadata のモック
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: oldCachedData,
        error: null,
      }),
    });

    const mockSelectGet = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    // upsertTwitchBroadcasterMetadata のモック
    const mockSingle = vi.fn().mockResolvedValue({
      data: newData,
      error: null,
    });

    const mockSelectUpsert = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelectUpsert,
    });

    mockSupabase.from = vi.fn().mockImplementation((table) => {
      if (table === "twitch_broadcasters") {
        return {
          select: mockSelectGet,
          upsert: mockUpsert,
        };
      }
      return {};
    });

    mockGetUsersByIds.mockResolvedValue([apiResponse]);

    const result = await fetchAndCacheTwitchBroadcasterMetadata(
      mockSupabase,
      "123456789",
      "app_access_token"
    );

    expect(mockGetUsersByIds).toHaveBeenCalledWith(["123456789"]);
    expect(result.username).toBe("newstreamer");
    expect(result.display_name).toBe("NewStreamer");
    expect(result.description).toBe("新しい説明");
  });

  it("APIエラー時に既存の良好なデータを保持する", async () => {
    const goodCachedData: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: "良好なデータ",
      display_name: "GoodStreamer",
      fetch_error: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25時間前（期限切れ）
      id: "uuid-123",
      profile_image_url: "https://example.com/good.jpg",
      updated_at: "2024-01-01T00:00:00Z",
      username: "goodstreamer",
    };

    // getTwitchBroadcasterMetadata のモック（古いが良好なデータ）
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: goodCachedData,
        error: null,
      }),
    });

    const mockSelectGet = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    // upsertTwitchBroadcasterMetadata のモック（エラー情報を保存するが良好なデータを保持）
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        ...goodCachedData,
        fetch_error: "API Error",
        fetched_at: new Date().toISOString(),
      },
      error: null,
    });

    const mockSelectUpsert = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelectUpsert,
    });

    mockSupabase.from = vi.fn().mockImplementation((table) => {
      if (table === "twitch_broadcasters") {
        return {
          select: mockSelectGet,
          upsert: mockUpsert,
        };
      }
      return {};
    });

    // APIがエラーをスロー
    mockGetUsersByIds.mockRejectedValue(new Error("API Error"));

    const result = await fetchAndCacheTwitchBroadcasterMetadata(
      mockSupabase,
      "123456789",
      "app_access_token"
    );

    // 良好な既存データが返される（nullではない）
    expect(result.username).toBe("goodstreamer");
    expect(result.display_name).toBe("GoodStreamer");
    expect(result.description).toBe("良好なデータ");
    expect(result.profile_image_url).toBe("https://example.com/good.jpg");

    // upsertが呼ばれ、エラー情報が記録されるが既存データは保持される
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcaster_id: "123456789",
        description: "良好なデータ",
        display_name: "GoodStreamer",
        fetch_error: "API Error",
        profile_image_url: "https://example.com/good.jpg",
        username: "goodstreamer",
      }),
      expect.any(Object)
    );
  });

  it("APIエラー時にキャッシュがない場合はエラーをスローする", async () => {
    // キャッシュなし
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const mockSelectGet = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        broadcaster_id: "123456789",
        fetch_error: "API Error",
        fetched_at: new Date().toISOString(),
      },
      error: null,
    });

    const mockSelectUpsert = vi.fn().mockReturnValue({
      single: mockSingle,
    });

    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelectUpsert,
    });

    mockSupabase.from = vi.fn().mockImplementation(() => ({
      select: mockSelectGet,
      upsert: mockUpsert,
    }));

    mockGetUsersByIds.mockRejectedValue(new Error("API Error"));

    await expect(
      fetchAndCacheTwitchBroadcasterMetadata(
        mockSupabase,
        "123456789",
        "app_access_token"
      )
    ).rejects.toThrow("API Error");
  });
});

describe("formatTwitchBroadcasterDisplay", () => {
  it("usernameがある場合はusernameとIDを表示する", () => {
    const metadata: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: null,
      display_name: "DisplayName",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      id: "uuid-123",
      profile_image_url: null,
      updated_at: "2024-01-01T00:00:00Z",
      username: "testuser",
    };

    expect(formatTwitchBroadcasterDisplay(metadata)).toBe(
      "testuser (123456789)"
    );
  });

  it("usernameがなくdisplay_nameがある場合はdisplay_nameとIDを表示する", () => {
    const metadata: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: null,
      display_name: "DisplayName",
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      id: "uuid-123",
      profile_image_url: null,
      updated_at: "2024-01-01T00:00:00Z",
      username: null,
    };

    expect(formatTwitchBroadcasterDisplay(metadata)).toBe(
      "DisplayName (123456789)"
    );
  });

  it("usernameもdisplay_nameもない場合はIDのみを表示する", () => {
    const metadata: Tables<"twitch_broadcasters"> = {
      broadcaster_id: "123456789",
      created_at: "2024-01-01T00:00:00Z",
      created_by: null,
      description: null,
      display_name: null,
      fetch_error: null,
      fetched_at: "2024-01-01T00:00:00Z",
      id: "uuid-123",
      profile_image_url: null,
      updated_at: "2024-01-01T00:00:00Z",
      username: null,
    };

    expect(formatTwitchBroadcasterDisplay(metadata)).toBe("123456789");
  });
});
