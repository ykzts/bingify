import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import {
  deleteOAuthToken,
  getOAuthToken,
  isTokenExpired,
  upsertOAuthToken,
} from "../token-storage";

// モックSupabaseクライアントの作成
const createMockSupabase = () => {
  return {
    rpc: vi.fn(),
  } as unknown as SupabaseClient<Database>;
};

describe("OAuth Token Storage", () => {
  describe("upsertOAuthToken", () => {
    it("成功時に success: true を返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await upsertOAuthToken(mockSupabase, {
        access_token: "test_access_token",
        expires_at: "2025-01-10T00:00:00Z",
        provider: "google",
        refresh_token: "test_refresh_token",
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("upsert_oauth_token", {
        p_access_token: "test_access_token",
        p_expires_at: "2025-01-10T00:00:00Z",
        p_provider: "google",
        p_refresh_token: "test_refresh_token",
      });
    });

    it("エラー時に success: false とエラーメッセージを返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" } as never,
      });

      const result = await upsertOAuthToken(mockSupabase, {
        access_token: "test_access_token",
        provider: "twitch",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("refresh_token が null の場合も処理できる", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const result = await upsertOAuthToken(mockSupabase, {
        access_token: "test_access_token",
        provider: "google",
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("upsert_oauth_token", {
        p_access_token: "test_access_token",
        p_expires_at: null,
        p_provider: "google",
        p_refresh_token: null,
      });
    });
  });

  describe("getOAuthToken", () => {
    it("成功時にトークン情報を返す", async () => {
      const mockSupabase = createMockSupabase();
      const mockTokenData = {
        access_token: "test_access_token",
        created_at: "2025-01-05T00:00:00Z",
        expires_at: "2025-01-10T00:00:00Z",
        provider: "google",
        refresh_token: "test_refresh_token",
        success: true,
        updated_at: "2025-01-05T00:00:00Z",
      };

      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: mockTokenData,
        error: null,
      });

      const result = await getOAuthToken(mockSupabase, "google");

      expect(result.success).toBe(true);
      expect(result.access_token).toBe("test_access_token");
      expect(result.refresh_token).toBe("test_refresh_token");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_oauth_token", {
        p_provider: "google",
      });
    });

    it("トークンが見つからない場合にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { error: "Token not found", success: false },
        error: null,
      });

      const result = await getOAuthToken(mockSupabase, "twitch");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token not found");
    });

    it("データベースエラー時にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "Connection failed" } as never,
      });

      const result = await getOAuthToken(mockSupabase, "google");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
    });
  });

  describe("deleteOAuthToken", () => {
    it("成功時に deleted: true を返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { deleted: true, provider: "google", success: true },
        error: null,
      });

      const result = await deleteOAuthToken(mockSupabase, "google");

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("delete_oauth_token", {
        p_provider: "google",
      });
    });

    it("トークンが存在しない場合に deleted: false を返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { deleted: false, provider: "twitch", success: true },
        error: null,
      });

      const result = await deleteOAuthToken(mockSupabase, "twitch");

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(false);
    });

    it("データベースエラー時にエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "Permission denied" } as never,
      });

      const result = await deleteOAuthToken(mockSupabase, "google");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });
  });

  describe("isTokenExpired", () => {
    it("有効期限切れのトークンに対して true を返す", () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it("まだ有効なトークンに対して false を返す（バッファを考慮）", () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it("5分以内に期限切れになるトークンに対して true を返す（バッファ）", () => {
      const nearFutureDate = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      expect(isTokenExpired(nearFutureDate)).toBe(true);
    });

    it("有効期限が null の場合に false を返す", () => {
      expect(isTokenExpired(null)).toBe(false);
    });

    it("有効期限が undefined の場合に false を返す", () => {
      expect(isTokenExpired(undefined)).toBe(false);
    });

    it("無効な日付文字列に対して false を返す", () => {
      expect(isTokenExpired("invalid-date")).toBe(false);
    });
  });
});
