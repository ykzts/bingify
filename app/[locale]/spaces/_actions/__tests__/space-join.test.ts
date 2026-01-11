import { beforeEach, describe, expect, test, vi } from "vitest";
import { checkOAuthTokenAvailability, getSpacePublicInfo } from "../space-join";

// Mock OAuth token storage functions using vi.hoisted
const { mockGetOAuthToken, mockIsTokenExpired } = vi.hoisted(() => ({
  mockGetOAuthToken: vi.fn(),
  mockIsTokenExpired: vi.fn(),
}));

// Mock YouTube and Twitch metadata functions using vi.hoisted
const { mockGetYouTubeChannelMetadata, mockGetTwitchBroadcasterMetadata } =
  vi.hoisted(() => ({
    mockGetTwitchBroadcasterMetadata: vi.fn(),
    mockGetYouTubeChannelMetadata: vi.fn(),
  }));

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/oauth/token-storage", () => ({
  getOAuthToken: mockGetOAuthToken,
  isTokenExpired: mockIsTokenExpired,
}));

vi.mock("@/lib/data/youtube-metadata", () => ({
  getYouTubeChannelMetadata: mockGetYouTubeChannelMetadata,
}));

vi.mock("@/lib/data/twitch-metadata", () => ({
  getTwitchBroadcasterMetadata: mockGetTwitchBroadcasterMetadata,
}));

// Mock privacy utilities
vi.mock("@/lib/privacy", () => ({
  maskEmailPatterns: vi.fn((patterns: string[]) =>
    patterns.map((p) =>
      p.startsWith("@") ? p : `${p[0]}***@${p.split("@")[1]}`
    )
  ),
}));

describe("getSpacePublicInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("無効なUUIDに対してnullを返す", async () => {
    const result = await getSpacePublicInfo("invalid-uuid");
    expect(result).toBeNull();
  });

  test("スペースが見つからない場合nullを返す", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(result).toBeNull();
  });

  test("アクティブなスペースに対してマスクされたメールを含むスペース情報を返す", async () => {
    const mockSpace = {
      description: "Test space description",
      gatekeeper_rules: {
        email: {
          allowed: ["user@example.com", "@company.com"],
        },
        youtube: {
          channelId: "UCtest123",
          requirement: "subscriber",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: false,
      },
      share_key: "test-space",
      status: "active",
      title: "Test Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    mockGetYouTubeChannelMetadata.mockResolvedValue({
      channel_id: "UCtest123",
      channel_title: "Test Channel",
      handle: "testchannel",
      thumbnail_url: "https://yt3.ggpht.com/test.jpg",
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Space");
    expect(result?.status).toBe("active");
    expect(result?.hideMetadata).toBe(false);
    expect(result?.gatekeeper_rules?.email?.allowed).toEqual([
      "u***@example.com",
      "@company.com",
    ]);
    expect(result?.gatekeeper_rules?.youtube?.requirement).toBe("subscriber");
    expect(result?.gatekeeper_rules?.youtube?.channelId).toBe("UCtest123");
    expect(result?.gatekeeper_rules?.youtube?.channel_title).toBe(
      "Test Channel"
    );
    expect(result?.gatekeeper_rules?.youtube?.handle).toBe("testchannel");
    expect(result?.gatekeeper_rules?.youtube?.thumbnail_url).toBe(
      "https://yt3.ggpht.com/test.jpg"
    );
  });

  test("ドラフトスペースに対してステータス付きのスペース情報を返す", async () => {
    const mockSpace = {
      description: "Draft space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "draft-space",
      status: "draft",
      title: "Draft Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("draft");
    expect(result?.hideMetadata).toBe(false);
  });

  test("hide_metadata_before_join設定を尊重する", async () => {
    const mockSpace = {
      description: "Private space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: true,
      },
      share_key: "private-space",
      status: "active",
      title: "Private Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.hideMetadata).toBe(true);
  });

  test("Twitchゲートキーパールールを持つスペース情報にメタデータを含めて返す", async () => {
    const mockSpace = {
      description: "Twitch-gated space",
      gatekeeper_rules: {
        twitch: {
          broadcasterId: "12345678",
          requirement: "follower",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "twitch-space",
      status: "active",
      title: "Twitch Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    mockGetTwitchBroadcasterMetadata.mockResolvedValue({
      broadcaster_id: "12345678",
      display_name: "TestStreamer",
      profile_image_url: "https://static-cdn.jtvnw.net/test.jpg",
      username: "teststreamer",
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules?.twitch?.requirement).toBe("follower");
    expect(result?.gatekeeper_rules?.twitch?.broadcasterId).toBe("12345678");
    expect(result?.gatekeeper_rules?.twitch?.display_name).toBe("TestStreamer");
    expect(result?.gatekeeper_rules?.twitch?.username).toBe("teststreamer");
    expect(result?.gatekeeper_rules?.twitch?.profile_image_url).toBe(
      "https://static-cdn.jtvnw.net/test.jpg"
    );
  });

  test("すべてのルールがnoneの場合nullのgatekeeper_rulesを返す", async () => {
    const mockSpace = {
      description: "Space with no restrictions",
      gatekeeper_rules: {
        youtube: {
          channelId: "UCtest",
          requirement: "none",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "open-space",
      status: "active",
      title: "Open Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules).toBeNull();
  });
});

describe("checkOAuthTokenAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ユーザーが認証されていない場合、available: false を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await checkOAuthTokenAvailability("google");

    expect(result.available).toBe(false);
    expect(result.error).toBe("User not authenticated");
  });

  test("有効なトークンが存在する場合、available: true を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user-123" } },
      error: null,
    });

    mockGetOAuthToken.mockResolvedValue({
      access_token: "valid_token",
      expires_at: "2030-01-01T00:00:00Z",
      success: true,
    });

    mockIsTokenExpired.mockReturnValue(false);

    const result = await checkOAuthTokenAvailability("google");

    expect(result.available).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("トークンが存在しない場合、available: false を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user-123" } },
      error: null,
    });

    mockGetOAuthToken.mockResolvedValue({
      access_token: null,
      success: true,
    });

    const result = await checkOAuthTokenAvailability("twitch");

    expect(result.available).toBe(false);
  });

  test("トークンが期限切れの場合、available: false を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user-123" } },
      error: null,
    });

    mockGetOAuthToken.mockResolvedValue({
      access_token: "expired_token",
      expires_at: "2020-01-01T00:00:00Z",
      success: true,
    });

    mockIsTokenExpired.mockReturnValue(true);

    const result = await checkOAuthTokenAvailability("google");

    expect(result.available).toBe(false);
    expect(result.error).toBe("Token expired");
  });

  test("トークン取得に失敗した場合、available: false を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user-123" } },
      error: null,
    });

    mockGetOAuthToken.mockResolvedValue({
      error: "Database error",
      success: false,
    });

    const result = await checkOAuthTokenAvailability("google");

    expect(result.available).toBe(false);
    expect(result.error).toBe("Database error");
  });
});
