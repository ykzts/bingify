import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import { refreshOAuthToken } from "../token-refresh";
// biome-ignore lint/performance/noNamespaceImport: Used in test mocks for clarity
import * as tokenStorage from "../token-storage";

// モックSupabaseクライアントの作成
const createMockSupabase = () => {
  return {
    rpc: vi.fn(),
  } as unknown as SupabaseClient<Database>;
};

// token-storage モジュールのモック
vi.mock("../token-storage", async () => {
  const actual = await vi.importActual("../token-storage");
  return {
    ...actual,
    getOAuthToken: vi.fn(),
    upsertOAuthToken: vi.fn(),
  };
});

// グローバルfetchのモック
global.fetch = vi.fn();

describe("Token Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数のモック
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = "google-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = "google-client-secret";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "twitch-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET = "twitch-client-secret";
  });

  describe("refreshOAuthToken", () => {
    it("期限切れのGoogleトークンを正常にリフレッシュする", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // 既存のトークンを返すモック
      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      // fetchモック（リフレッシュリクエスト）
      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_access_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        ok: true,
      } as Response);

      // upsertトークンのモック
      vi.mocked(tokenStorage.upsertOAuthToken).mockResolvedValueOnce({
        success: true,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(true);
      expect(result.provider).toBe("google");
      expect(result.error).toBeUndefined();
      expect(tokenStorage.upsertOAuthToken).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          access_token: "new_access_token",
          provider: "google",
          refresh_token: "refresh_token",
        })
      );
    });

    it("期限切れのTwitchトークンを正常にリフレッシュする", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "twitch",
        refresh_token: "refresh_token",
        success: true,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_twitch_token",
          expires_in: 7200,
          refresh_token: "new_refresh_token",
        }),
        ok: true,
      } as Response);

      vi.mocked(tokenStorage.upsertOAuthToken).mockResolvedValueOnce({
        success: true,
      });

      const result = await refreshOAuthToken(mockSupabase, "twitch");

      expect(result.refreshed).toBe(true);
      expect(result.provider).toBe("twitch");
      expect(tokenStorage.upsertOAuthToken).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          access_token: "new_twitch_token",
          provider: "twitch",
          refresh_token: "new_refresh_token",
        })
      );
    });

    it("まだ有効なトークンはスキップする", async () => {
      const mockSupabase = createMockSupabase();
      const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "valid_access_token",
        expires_at: futureTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.skipped).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("リフレッシュトークンがない場合はスキップする", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: null,
        success: true,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toBe("No refresh token available");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("トークンが見つからない場合にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        error: "Token not found",
        success: false,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.error).toBe("Token not found");
    });

    it("HTTPエラー時にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "invalid_refresh_token",
        success: true,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked",
        }),
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been expired or revoked",
          }),
      } as Response);

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.error).toContain("Token has been expired or revoked");
    });

    it("ネットワークエラー時にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      // fetchがネットワークエラーで失敗
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("トークンリフレッシュ成功後、保存に失敗した場合にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_access_token",
          expires_in: 3600,
        }),
        ok: true,
      } as Response);

      vi.mocked(tokenStorage.upsertOAuthToken).mockResolvedValueOnce({
        error: "Database error",
        success: false,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("環境変数が設定されていない場合にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // 環境変数をクリア
      const originalClientId =
        process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
      // biome-ignore lint/performance/noDelete: Required for testing undefined environment variables
      delete process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(false);
      expect(result.error).toContain("credentials not configured");

      // 環境変数を復元
      if (originalClientId) {
        process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = originalClientId;
      }
    });

    it("expires_inがない場合はexpiresAtをnullにする", async () => {
      const mockSupabase = createMockSupabase();
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      vi.mocked(tokenStorage.getOAuthToken).mockResolvedValueOnce({
        access_token: "old_access_token",
        expires_at: expiredTime,
        provider: "google",
        refresh_token: "refresh_token",
        success: true,
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        json: async () => ({
          access_token: "new_access_token",
          // expires_in なし
        }),
        ok: true,
      } as Response);

      vi.mocked(tokenStorage.upsertOAuthToken).mockImplementationOnce(
        async (_supabase, token) => {
          // expires_at が null であることを確認
          expect(token.expires_at).toBeNull();
          return {
            success: true,
          };
        }
      );

      const result = await refreshOAuthToken(mockSupabase, "google");

      expect(result.refreshed).toBe(true);
    });
  });
});
