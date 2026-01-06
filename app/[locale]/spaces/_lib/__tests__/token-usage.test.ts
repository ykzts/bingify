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
}));

// Twitch API のモック
vi.mock("@/lib/twitch", () => ({
  checkFollowStatus: vi.fn(),
  checkSubStatus: vi.fn(),
}));

// YouTube API のモック
vi.mock("@/lib/youtube", () => ({
  checkMembershipStatus: vi.fn(),
  checkSubscriptionStatus: vi.fn(),
}));

// テスト用にモック関数をインポート
import { checkFollowStatus, checkSubStatus } from "@/lib/twitch";
import { checkSubscriptionStatus } from "@/lib/youtube";
import { getOAuthToken } from "@/lib/oauth/token-storage";
import { joinSpace } from "../actions";

describe("OAuth Token Usage in joinSpace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("YouTube トークン取得と使用", () => {
    test("保存されたGoogleトークンを使用してYouTube登録を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
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

      // データベースから保存されたトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "stored_google_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "google",
        refresh_token: "stored_refresh_token",
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // YouTube API が成功を返すようにモック
      vi.mocked(checkSubscriptionStatus).mockResolvedValue({
        isSubscribed: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // getOAuthToken が正しく呼ばれたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "google");

      // 取得したトークンが YouTube API に渡されたことを確認
      expect(checkSubscriptionStatus).toHaveBeenCalledWith(
        "stored_google_token",
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
      expect(checkSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  describe("Twitch トークン取得と使用", () => {
    test("保存されたTwitchトークンを使用してフォロー状態を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          twitch: {
            broadcasterId: "12345",
            requirement: "follower",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
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
        if (table === "participants") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      // データベースから保存されたトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "stored_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // Twitch API が成功を返すようにモック
      vi.mocked(checkFollowStatus).mockResolvedValue({
        isFollowing: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // getOAuthToken が正しく呼ばれたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "twitch");

      // 取得したトークンが Twitch API に渡されたことを確認
      expect(checkFollowStatus).toHaveBeenCalledWith(
        "stored_twitch_token",
        "twitch_user_id",
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
      expect(checkFollowStatus).not.toHaveBeenCalled();
    });

    test("保存されたTwitchトークンを使用してサブスクリプション状態を確認する", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          twitch: {
            broadcasterId: "12345",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
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
        if (table === "participants") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: null,
            }),
          };
        }
        return {};
      });

      // データベースから保存されたトークンを取得する動作をモック
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: "stored_twitch_token",
        created_at: "2025-01-01T00:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
        provider: "twitch",
        refresh_token: null,
        success: true,
        updated_at: "2025-01-01T00:00:00Z",
      });

      // Twitch API が成功を返すようにモック
      vi.mocked(checkSubStatus).mockResolvedValue({
        isSubscribed: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      // getOAuthToken が正しく呼ばれたことを確認
      expect(getOAuthToken).toHaveBeenCalledWith(mockSupabase, "twitch");

      // 取得したトークンが Twitch API に渡されたことを確認
      expect(checkSubStatus).toHaveBeenCalledWith(
        "stored_twitch_token",
        "twitch_user_id",
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

    test("アクセストークンがnullの場合エラーを返す", async () => {
      const mockSpace = {
        created_at: new Date().toISOString(),
        gatekeeper_rules: {
          youtube: {
            channelId: "UCtest123",
            requirement: "subscriber",
          },
        },
        id: "123e4567-e89b-12d3-a456-426614174000",
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

      // アクセストークンがnullの場合
      vi.mocked(getOAuthToken).mockResolvedValue({
        access_token: undefined,
        success: true,
      });

      const result = await joinSpace("123e4567-e89b-12d3-a456-426614174000");

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("errorYouTubeVerificationRequired");
    });
  });
});
