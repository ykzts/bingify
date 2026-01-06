import { beforeEach, describe, expect, test, vi } from "vitest";

// モック用のSupabaseクライアント
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

// Supabase クライアントのモック
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// OAuth token storage のモック
vi.mock("@/lib/oauth/token-storage", () => ({
  getOAuthToken: vi.fn(),
  getOAuthTokenForUser: vi.fn(),
}));

// Supabase admin のモック
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Twitch API のモック
vi.mock("@/lib/twitch", () => ({
  checkFollowStatus: vi.fn(),
  checkFollowWithAdminToken: vi.fn(),
  checkSubStatus: vi.fn(),
  checkSubWithAdminToken: vi.fn(),
}));

// YouTube API のモック
vi.mock("@/lib/youtube", () => ({
  checkMembershipStatus: vi.fn(),
  checkMembershipWithAdminToken: vi.fn(),
  checkSubscriptionStatus: vi.fn(),
  checkSubscriptionWithAdminToken: vi.fn(),
}));

import { getOAuthToken, getOAuthTokenForUser } from "@/lib/oauth/token-storage";
// テスト用にモック関数をインポート
import {
  checkFollowWithAdminToken,
  checkSubWithAdminToken,
} from "@/lib/twitch";
import { checkSubscriptionWithAdminToken } from "@/lib/youtube";
import { joinSpace } from "../actions";

describe("OAuth Token Usage in joinSpace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("YouTube トークン取得と使用", () => {
    test("参加者と管理者のトークンを使用してYouTube登録を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      // Supabase クライアントのモック設定
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "participants") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      // 参加者のトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "participant_google_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "google",
        refresh_token: "participant_refresh_token",
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // 管理者のトークンを取得する動作をモック
      vi.mocked(getOAuthTokenForUser).mockResolvedValue({
        access_token: "owner_google_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "google",
        refresh_token: "owner_refresh_token",
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // YouTube API が成功を返すようにモック
      vi.mocked(checkSubscriptionWithAdminToken).mockResolvedValue({
        isSubscribed: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // 参加者のトークンが取得されたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "google");

      // 管理者のトークンが取得されたことを確認
      expect(getOAuthTokenForUser).toHaveBeenCalledWith("owner123", "google");

      // 両方のトークンが YouTube API に渡されたことを確認
      expect(checkSubscriptionWithAdminToken).toHaveBeenCalledWith(
        "participant_google_token",
        "owner_google_token",
        "UCtest123"
      );

      expect(result.success).toBe(true);
    });

    test("Googleトークンが見つからない場合エラーを返す", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // トークンが見つからない場合
      vi.mocked(getOAuthToken).mockResolvedValue({
        error: "Token not found",
        success: false,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("errorYouTubeVerificationRequired");
      expect(checkSubscriptionWithAdminToken).not.toHaveBeenCalled();
    });
  });

  describe("Twitch トークン取得と使用", () => {
    test("参加者と管理者のトークンを使用してフォロー状態を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          twitch: {
            broadcasterId: "12345",
            requirement: "follower",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "participants") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      // 参加者のトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "participant_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // 管理者のトークンを取得する動作をモック
      vi.mocked(getOAuthTokenForUser).mockResolvedValue({
        access_token: "owner_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // Twitch API が成功を返すようにモック
      vi.mocked(checkFollowWithAdminToken).mockResolvedValue({
        isFollowing: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // 参加者のトークンが取得されたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "twitch");

      // 管理者のトークンが取得されたことを確認
      expect(getOAuthTokenForUser).toHaveBeenCalledWith("owner123", "twitch");

      // 両方のトークンが Twitch API に渡されたことを確認
      expect(checkFollowWithAdminToken).toHaveBeenCalledWith(
        "participant_twitch_token",
        "owner_twitch_token",
        "12345"
      );

      expect(result.success).toBe(true);
    });

    test("Twitchトークンが見つからない場合エラーを返す", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          twitch: {
            broadcasterId: "12345",
            requirement: "follower",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              identities: [
                {
                  id: "twitch_user_id",
                  provider: "twitch",
                },
              ],
            },
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // トークンが見つからない場合
      vi.mocked(getOAuthToken).mockResolvedValue({
        error: "Token not found",
        success: false,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("errorTwitchVerificationRequired");
      expect(checkFollowWithAdminToken).not.toHaveBeenCalled();
    });

    test("参加者と管理者のトークンを使用してサブスクリプション状態を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          twitch: {
            broadcasterId: "12345",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "participants") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      // 参加者のトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "participant_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // 管理者のトークンを取得する動作をモック
      vi.mocked(getOAuthTokenForUser).mockResolvedValue({
        access_token: "owner_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // Twitch API が成功を返すようにモック
      vi.mocked(checkSubWithAdminToken).mockResolvedValue({
        isSubscribed: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // 参加者のトークンが取得されたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "twitch");

      // 管理者のトークンが取得されたことを確認
      expect(getOAuthTokenForUser).toHaveBeenCalledWith("owner123", "twitch");

      // 両方のトークンが Twitch API に渡されたことを確認
      expect(checkSubWithAdminToken).toHaveBeenCalledWith(
        "participant_twitch_token",
        "owner_twitch_token",
        "12345"
      );

      expect(result.success).toBe(true);
    });
  });

  describe("トークン取得エラーハンドリング", () => {
    test("データベースエラー時に適切なエラーを返す", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // データベースエラーをシミュレート
      vi.mocked(getOAuthToken).mockResolvedValue({
        error: "Database connection failed",
        success: false,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("errorYouTubeVerificationRequired");
    });

    test("アクセストークンが存在しない場合エラーを返す", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
        owner_id: "owner123",
        status: "active",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            email: "test@example.com",
            id: "user123",
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "system_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { space_expiration_hours: 0 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // アクセストークンがundefinedの場合
      vi.mocked(getOAuthToken).mockResolvedValue({
        success: true,
      } as never);

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("errorYouTubeVerificationRequired");
    });
  });
});
