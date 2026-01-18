import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCredentialsCache } from "@/lib/oauth-credentials";
import type { Database } from "@/types/supabase";
import {
  getOAuthTokenForUserWithRefresh,
  getOAuthTokenWithRefresh,
  isTokenExpired,
} from "../token-storage";

// モックSupabaseクライアントの作成
const createMockSupabase = () => {
  return {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  } as unknown as SupabaseClient<Database>;
};

// グローバルfetchのモック
global.fetch = vi.fn();

// admin クライアントのモック
let mockAdminClient: SupabaseClient<Database>;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}));

describe("Token Storage with Auto-Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCredentialsCache();
    mockAdminClient = createMockSupabase();
    // 環境変数のモック
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = "google-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = "google-client-secret";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "twitch-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET = "twitch-client-secret";
  });

  describe("getOAuthTokenWithRefresh", () => {
    it("有効なトークンはそのまま返す", async () => {
      const mockSupabase = createMockSupabase();
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // ユーザー認証のモック
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: { id: "user-123" } as never,
        },
        error: null,
      });

      // 有効なトークンを返すモック
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: {
          data: {
            access_token: "valid_token",
            expires_at: futureTime,
            provider: "google",
            refresh_token: "refresh_token",
          },
          success: true,
        },
        error: null,
      });

      const result = await getOAuthTokenWithRefresh(mockSupabase, "google");

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("valid_token");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_oauth_token", {
        p_provider: "google",
      });
      // リフレッシュは呼ばれない
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("期限切れトークンを自動的にリフレッシュする", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const newExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      // ユーザー認証のモック
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: { id: "user-123" } as never,
        },
        error: null,
      });

      // RPC呼び出しを順番にモック
      let rpcCallCount = 0;
      vi.mocked(mockSupabase.rpc).mockImplementation(
        (method: string, _params?: unknown) => {
          rpcCallCount++;

          if (rpcCallCount === 1 && method === "get_oauth_token") {
            // 1回目: 期限切れトークンを返す
            return Promise.resolve({
              data: {
                data: {
                  access_token: "expired_token",
                  expires_at: expiredTime,
                  provider: "google",
                  refresh_token: "refresh_token",
                },
                success: true,
              },
              error: null,
            }) as never;
          }
          if (rpcCallCount === 2 && method === "get_oauth_token") {
            // 2回目: refreshOAuthToken内のget_oauth_tokenの呼び出し
            return Promise.resolve({
              data: {
                data: {
                  access_token: "expired_token",
                  expires_at: expiredTime,
                  provider: "google",
                  refresh_token: "refresh_token",
                },
                success: true,
              },
              error: null,
            }) as never;
          }
          if (rpcCallCount === 3 && method === "upsert_oauth_token") {
            // 3回目: upsert成功
            return Promise.resolve({
              data: {
                success: true,
              },
              error: null,
            }) as never;
          }
          if (rpcCallCount === 4 && method === "get_oauth_token") {
            // 4回目: リフレッシュ後の新しいトークンを返す
            return Promise.resolve({
              data: {
                data: {
                  access_token: "new_token",
                  expires_at: newExpiresAt,
                  provider: "google",
                  refresh_token: "refresh_token",
                },
                success: true,
              },
              error: null,
            }) as never;
          }

          return Promise.resolve({
            data: { error: "Unexpected call", success: false },
            error: null,
          }) as never;
        }
      );

      // fetchモック（リフレッシュリクエスト）
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        ok: true,
      } as Response);

      const result = await getOAuthTokenWithRefresh(mockSupabase, "google");

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("new_token");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("リフレッシュトークンがない場合はエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // ユーザー認証のモック
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: { id: "user-123" } as never,
        },
        error: null,
      });

      // 期限切れでリフレッシュトークンがないトークンを返すモック
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: {
          data: {
            access_token: "expired_token",
            expires_at: expiredTime,
            provider: "google",
            refresh_token: null,
          },
          success: true,
        },
        error: null,
      });

      const result = await getOAuthTokenWithRefresh(mockSupabase, "google");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token expired and no refresh token available");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("ユーザー未認証の場合はエラーを返す", async () => {
      const mockSupabase = createMockSupabase();

      // ユーザー未認証のモック
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: null as never,
        },
        error: null,
      });

      const result = await getOAuthTokenWithRefresh(mockSupabase, "google");

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not authenticated");
    });

    it("トークン取得自体が失敗した場合はエラーを返す", async () => {
      const mockSupabase = createMockSupabase();

      // ユーザー認証のモック
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: { id: "user-123" } as never,
        },
        error: null,
      });

      // トークン取得失敗のモック
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { error: "Token not found", success: false },
        error: null,
      });

      const result = await getOAuthTokenWithRefresh(mockSupabase, "google");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token not found");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("getOAuthTokenForUserWithRefresh", () => {
    it("有効なトークンはそのまま返す", async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // 有効なトークンを返すモック
      vi.mocked(mockAdminClient.rpc).mockResolvedValueOnce({
        data: {
          data: {
            access_token: "valid_token",
            expires_at: futureTime,
            provider: "google",
            refresh_token: "refresh_token",
          },
          success: true,
        },
        error: null,
      });

      const result = await getOAuthTokenForUserWithRefresh(
        "user-456",
        "google"
      );

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("valid_token");
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        "get_oauth_token_for_user",
        {
          p_provider: "google",
          p_user_id: "user-456",
        }
      );
      // リフレッシュは呼ばれない
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("期限切れトークンを自動的にリフレッシュする", async () => {
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const newExpiresAt = new Date(Date.now() + 7200 * 1000).toISOString();

      // RPC calls in order:
      // 1. get_oauth_provider_config (for getTwitchCredentials) - return empty config
      // 2. get_oauth_token_for_user - return expired token
      // 3. upsert_oauth_token_for_user - return success
      // 4. get_oauth_token_for_user - return refreshed token
      vi.mocked(mockAdminClient.rpc)
        .mockResolvedValueOnce({
          // get_oauth_provider_config - no config in DB, will fall back to env vars
          data: {
            success: false,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              access_token: "expired_token",
              expires_at: expiredTime,
              provider: "twitch",
              refresh_token: "refresh_token",
            },
            success: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              access_token: "new_token",
              expires_at: newExpiresAt,
              provider: "twitch",
              refresh_token: "new_refresh_token",
            },
            success: true,
          },
          error: null,
        });

      // fetchモック（リフレッシュリクエスト）
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_token",
          expires_in: 7200,
          refresh_token: "new_refresh_token",
        }),
        ok: true,
      } as Response);

      const result = await getOAuthTokenForUserWithRefresh(
        "user-456",
        "twitch"
      );

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("new_token");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://id.twitch.tv/oauth2/token",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("リフレッシュトークンがない場合はエラーを返す", async () => {
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // 期限切れでリフレッシュトークンがないトークンを返すモック
      vi.mocked(mockAdminClient.rpc).mockResolvedValueOnce({
        data: {
          data: {
            access_token: "expired_token",
            expires_at: expiredTime,
            provider: "google",
            refresh_token: null,
          },
          success: true,
        },
        error: null,
      });

      const result = await getOAuthTokenForUserWithRefresh(
        "user-456",
        "google"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token expired and no refresh token available");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("トークン取得自体が失敗した場合はエラーを返す", async () => {
      // トークン取得失敗のモック
      vi.mocked(mockAdminClient.rpc).mockResolvedValueOnce({
        data: { error: "User not found", success: false },
        error: null,
      });

      const result = await getOAuthTokenForUserWithRefresh(
        "user-456",
        "google"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("isTokenExpired", () => {
    it("有効期限切れのトークンに対して true を返す", () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it("まだ有効なトークンに対して false を返す", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it("5分以内に期限切れになるトークンに対して true を返す（バッファ）", () => {
      const nearFutureDate = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      expect(isTokenExpired(nearFutureDate)).toBe(true);
    });
  });
});
