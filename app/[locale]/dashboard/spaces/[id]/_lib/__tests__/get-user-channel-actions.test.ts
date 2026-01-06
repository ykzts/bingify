import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOperatorTwitchBroadcasterId,
  getOperatorYouTubeChannelId,
} from "../get-user-channel-actions";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/oauth/token-storage", () => ({
  getOAuthToken: vi.fn(),
}));

vi.mock("@/lib/youtube", () => ({
  getUserYouTubeChannelId: vi.fn(),
}));

vi.mock("@/lib/twitch", () => ({
  getUserTwitchId: vi.fn(),
}));

describe("getOperatorYouTubeChannelId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーのYouTubeチャンネルIDを正常に取得する", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserYouTubeChannelId } = await import("@/lib/youtube");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-youtube-token",
      success: true,
    });
    vi.mocked(getUserYouTubeChannelId).mockResolvedValue({
      channelId: "UC123456789",
    });

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(true);
    expect(result.channelId).toBe("UC123456789");
    expect(result.error).toBeUndefined();
    expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "google");
    expect(getUserYouTubeChannelId).toHaveBeenCalledWith("mock-youtube-token");
  });

  it("ユーザーが認証されていない場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorAuthRequired");
    expect(result.channelId).toBeUndefined();
  });

  it("YouTubeアカウントが連携されていない場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      success: false,
      error: "Token not found",
    });

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorYoutubeNotLinked");
    expect(result.channelId).toBeUndefined();
  });

  it("YouTubeチャンネルが見つからない場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserYouTubeChannelId } = await import("@/lib/youtube");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-youtube-token",
      success: true,
    });
    vi.mocked(getUserYouTubeChannelId).mockResolvedValue({
      error: "No channel found for this user",
    });

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorYoutubeChannelNotFound");
    expect(result.channelId).toBeUndefined();
  });

  it("トークンの有効期限切れエラーキーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserYouTubeChannelId } = await import("@/lib/youtube");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-youtube-token",
      success: true,
    });
    vi.mocked(getUserYouTubeChannelId).mockResolvedValue({
      error: "ERROR_YOUTUBE_TOKEN_EXPIRED",
    });

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorYoutubeTokenExpired");
    expect(result.channelId).toBeUndefined();
  });

  it("権限不足エラーキーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserYouTubeChannelId } = await import("@/lib/youtube");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-youtube-token",
      success: true,
    });
    vi.mocked(getUserYouTubeChannelId).mockResolvedValue({
      error: "ERROR_YOUTUBE_INSUFFICIENT_PERMISSIONS",
    });

    const result = await getOperatorYouTubeChannelId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorYoutubeInsufficientPermissions");
    expect(result.channelId).toBeUndefined();
  });
});

describe("getOperatorTwitchBroadcasterId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーのTwitchブロードキャスターIDを正常に取得する", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserTwitchId } = await import("@/lib/twitch");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-twitch-token",
      success: true,
    });
    vi.mocked(getUserTwitchId).mockResolvedValue({
      userId: "123456789",
    });

    const result = await getOperatorTwitchBroadcasterId();

    expect(result.success).toBe(true);
    expect(result.channelId).toBe("123456789");
    expect(result.error).toBeUndefined();
    expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "twitch");
    expect(getUserTwitchId).toHaveBeenCalledWith("mock-twitch-token");
  });

  it("ユーザーが認証されていない場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const result = await getOperatorTwitchBroadcasterId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorAuthRequired");
    expect(result.channelId).toBeUndefined();
  });

  it("Twitchアカウントが連携されていない場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      success: false,
      error: "Token not found",
    });

    const result = await getOperatorTwitchBroadcasterId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("errorTwitchNotLinked");
    expect(result.channelId).toBeUndefined();
  });

  it("TwitchユーザーIDの取得に失敗した場合はエラーを返す", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getOAuthToken } = await import("@/lib/oauth/token-storage");
    const { getUserTwitchId } = await import("@/lib/twitch");

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(getOAuthToken).mockResolvedValue({
      access_token: "mock-twitch-token",
      success: true,
    });
    vi.mocked(getUserTwitchId).mockResolvedValue({
      error: "Failed to get user information",
    });

    const result = await getOperatorTwitchBroadcasterId();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to get user information");
    expect(result.channelId).toBeUndefined();
  });
});
