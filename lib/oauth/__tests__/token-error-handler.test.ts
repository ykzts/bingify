import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import {
  classifyOAuthError,
  classifyProviderError,
  handleOAuthError,
  OAuthErrorType,
  requiresReauthentication,
} from "../token-error-handler";
// biome-ignore lint/performance/noNamespaceImport: テストのモックで使用
import * as tokenStorage from "../token-storage";

// token-storage モジュールのモック
vi.mock("../token-storage", async () => {
  const actual = await vi.importActual("../token-storage");
  return {
    ...actual,
    deleteOAuthToken: vi.fn(),
  };
});

// モックSupabaseクライアントの作成
const createMockSupabase = () => {
  return {
    rpc: vi.fn(),
  } as unknown as SupabaseClient<Database>;
};

describe("Token Error Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // コンソールのモック（ログ出力を抑制）
    vi.spyOn(console, "error").mockImplementation(() => {
      /* 出力を抑制 */
    });
    vi.spyOn(console, "warn").mockImplementation(() => {
      /* 出力を抑制 */
    });
    vi.spyOn(console, "log").mockImplementation(() => {
      /* 出力を抑制 */
    });
  });

  describe("classifyOAuthError", () => {
    it("401ステータスコードをTOKEN_INVALIDと分類する", () => {
      const error = { status: 401 };
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("403ステータスコードをINSUFFICIENT_PERMISSIONSと分類する", () => {
      const error = { status: 403 };
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.INSUFFICIENT_PERMISSIONS
      );
    });

    it("response.statusの401をTOKEN_INVALIDと分類する", () => {
      const error = { response: { status: 401 } };
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("codeプロパティの403をINSUFFICIENT_PERMISSIONSと分類する", () => {
      const error = { code: 403 };
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.INSUFFICIENT_PERMISSIONS
      );
    });

    it("エラーメッセージに'401'が含まれる場合TOKEN_INVALIDと分類する", () => {
      const error = new Error("Request failed with status 401");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("エラーメッセージに'unauthorized'が含まれる場合TOKEN_INVALIDと分類する", () => {
      const error = new Error("Unauthorized access");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("エラーメッセージに'invalid credentials'が含まれる場合TOKEN_INVALIDと分類する", () => {
      const error = new Error("Invalid credentials provided");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("エラーメッセージに'invalid_grant'が含まれる場合TOKEN_INVALIDと分類する", () => {
      const error = new Error("Error: invalid_grant");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("エラーメッセージに'token has been expired or revoked'が含まれる場合TOKEN_INVALIDと分類する", () => {
      const error = new Error("Token has been expired or revoked");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.TOKEN_INVALID);
    });

    it("エラーメッセージに'403'が含まれる場合INSUFFICIENT_PERMISSIONSと分類する", () => {
      const error = new Error("403 Forbidden");
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.INSUFFICIENT_PERMISSIONS
      );
    });

    it("エラーメッセージに'forbidden'が含まれる場合INSUFFICIENT_PERMISSIONSと分類する", () => {
      const error = new Error("Access forbidden");
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.INSUFFICIENT_PERMISSIONS
      );
    });

    it("エラーメッセージに'insufficient'が含まれる場合INSUFFICIENT_PERMISSIONSと分類する", () => {
      const error = new Error("Insufficient permissions");
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.INSUFFICIENT_PERMISSIONS
      );
    });

    it("リフレッシュトークンが無効な場合REFRESH_TOKEN_INVALIDと分類する", () => {
      const error = new Error("Refresh token is invalid");
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.REFRESH_TOKEN_INVALID
      );
    });

    it("リフレッシュトークンが期限切れの場合REFRESH_TOKEN_INVALIDと分類する", () => {
      const error = new Error("Refresh token has expired");
      expect(classifyOAuthError(error)).toBe(
        OAuthErrorType.REFRESH_TOKEN_INVALID
      );
    });

    it("ネットワークエラーをNETWORK_ERRORと分類する", () => {
      const error = new Error("Network error occurred");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.NETWORK_ERROR);
    });

    it("fetch failedをNETWORK_ERRORと分類する", () => {
      const error = new Error("Fetch failed");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.NETWORK_ERROR);
    });

    it("ECONNREFUSEDをNETWORK_ERRORと分類する", () => {
      const error = new Error("ECONNREFUSED: connection refused");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.NETWORK_ERROR);
    });

    it("分類できないエラーをUNKNOWNと分類する", () => {
      const error = new Error("Some unknown error");
      expect(classifyOAuthError(error)).toBe(OAuthErrorType.UNKNOWN);
    });

    it("nullの場合UNKNOWNと分類する", () => {
      expect(classifyOAuthError(null)).toBe(OAuthErrorType.UNKNOWN);
    });

    it("undefinedの場合UNKNOWNと分類する", () => {
      expect(classifyOAuthError(undefined)).toBe(OAuthErrorType.UNKNOWN);
    });
  });

  describe("classifyProviderError", () => {
    it("Googleの'invalid_grant'エラーをTOKEN_INVALIDと分類する", () => {
      const error = new Error("invalid_grant: Token has been revoked");
      expect(classifyProviderError(error, "google")).toBe(
        OAuthErrorType.TOKEN_INVALID
      );
    });

    it("Googleの'token_expired'エラーをTOKEN_INVALIDと分類する", () => {
      const error = new Error("token_expired");
      expect(classifyProviderError(error, "google")).toBe(
        OAuthErrorType.TOKEN_INVALID
      );
    });

    it("Twitchの'invalid token'エラーをTOKEN_INVALIDと分類する", () => {
      const error = new Error("Invalid token provided");
      expect(classifyProviderError(error, "twitch")).toBe(
        OAuthErrorType.TOKEN_INVALID
      );
    });

    it("プロバイダー固有のパターンがない場合、基本分類を使用する", () => {
      const error = { status: 401 };
      expect(classifyProviderError(error, "google")).toBe(
        OAuthErrorType.TOKEN_INVALID
      );
    });
  });

  describe("requiresReauthentication", () => {
    it("TOKEN_INVALIDの場合trueを返す", () => {
      expect(requiresReauthentication(OAuthErrorType.TOKEN_INVALID)).toBe(true);
    });

    it("REFRESH_TOKEN_INVALIDの場合trueを返す", () => {
      expect(
        requiresReauthentication(OAuthErrorType.REFRESH_TOKEN_INVALID)
      ).toBe(true);
    });

    it("INSUFFICIENT_PERMISSIONSの場合falseを返す", () => {
      expect(
        requiresReauthentication(OAuthErrorType.INSUFFICIENT_PERMISSIONS)
      ).toBe(false);
    });

    it("NETWORK_ERRORの場合falseを返す", () => {
      expect(requiresReauthentication(OAuthErrorType.NETWORK_ERROR)).toBe(
        false
      );
    });

    it("UNKNOWNの場合falseを返す", () => {
      expect(requiresReauthentication(OAuthErrorType.UNKNOWN)).toBe(false);
    });
  });

  describe("handleOAuthError", () => {
    it("無効なトークンを検出して削除する（401エラー）", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        deleted: true,
        provider: "google",
        success: true,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(true);
      expect(result.requiresReauth).toBe(true);
      expect(result.provider).toBe("google");
      expect(tokenStorage.deleteOAuthToken).toHaveBeenCalledWith(
        mockSupabase,
        "google"
      );
    });

    it("無効なトークンを検出して削除する（invalid_grantエラー）", async () => {
      const mockSupabase = createMockSupabase();
      const error = new Error("invalid_grant: Token has been revoked");

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        deleted: true,
        provider: "twitch",
        success: true,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "twitch",
        "token refresh"
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(true);
      expect(result.requiresReauth).toBe(true);
    });

    it("トークン削除に失敗した場合でも処理を継続する", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        error: "Database error",
        success: false,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(true);
    });

    it("トークンが存在しない場合は削除しない", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        deleted: false,
        provider: "google",
        success: true,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(true);
    });

    it("権限不足エラーの場合はトークンを削除しない", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 403 };

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "API call"
      );

      expect(result.errorType).toBe(OAuthErrorType.INSUFFICIENT_PERMISSIONS);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(false);
      expect(tokenStorage.deleteOAuthToken).not.toHaveBeenCalled();
    });

    it("ネットワークエラーの場合はトークンを削除しない", async () => {
      const mockSupabase = createMockSupabase();
      const error = new Error("Network error");

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "twitch",
        "API call"
      );

      expect(result.errorType).toBe(OAuthErrorType.NETWORK_ERROR);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(false);
      expect(tokenStorage.deleteOAuthToken).not.toHaveBeenCalled();
    });

    it("不明なエラーの場合はトークンを削除しない", async () => {
      const mockSupabase = createMockSupabase();
      const error = new Error("Some random error");

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "unknown operation"
      );

      expect(result.errorType).toBe(OAuthErrorType.UNKNOWN);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(false);
      expect(tokenStorage.deleteOAuthToken).not.toHaveBeenCalled();
    });

    it("トークン削除中に例外が発生してもエラーを返す", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };

      vi.mocked(tokenStorage.deleteOAuthToken).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(true);
    });

    it("エラーメッセージを適切に記録する", async () => {
      const mockSupabase = createMockSupabase();
      const errorMessage = "Custom error message";
      const error = new Error(errorMessage);

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        deleted: true,
        provider: "google",
        success: true,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.message).toBe(errorMessage);
    });

    it("Errorオブジェクトでない場合は文字列に変換する", async () => {
      const mockSupabase = createMockSupabase();
      const error = { customError: "something went wrong" };

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "test context"
      );

      expect(result.message).toContain("customError");
    });

    it("リフレッシュトークン無効エラーでもトークンを削除する", async () => {
      const mockSupabase = createMockSupabase();
      const error = new Error("Refresh token is invalid");

      vi.mocked(tokenStorage.deleteOAuthToken).mockResolvedValueOnce({
        deleted: true,
        provider: "google",
        success: true,
      });

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "token refresh"
      );

      expect(result.errorType).toBe(OAuthErrorType.REFRESH_TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(true);
      expect(result.requiresReauth).toBe(true);
      expect(tokenStorage.deleteOAuthToken).toHaveBeenCalled();
    });

    it("service roleコンテキスト（userId指定）でトークンを削除する", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };
      const userId = "test-user-id";

      // service role用のRPC呼び出しをモック
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: { deleted: true, provider: "google", success: true },
        error: null,
      } as never);

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "cron refresh",
        userId
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(true);
      expect(result.requiresReauth).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "delete_oauth_token_for_user",
        {
          p_provider: "google",
          p_user_id: userId,
        }
      );
      // 通常のdeleteOAuthTokenは呼ばれない
      expect(tokenStorage.deleteOAuthToken).not.toHaveBeenCalled();
    });

    it("service roleコンテキストでRPCエラーが発生した場合", async () => {
      const mockSupabase = createMockSupabase();
      const error = { status: 401 };
      const userId = "test-user-id";

      // RPCエラーをモック
      vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: "RPC call failed" } as never,
      } as never);

      const result = await handleOAuthError(
        mockSupabase,
        error,
        "google",
        "cron refresh",
        userId
      );

      expect(result.errorType).toBe(OAuthErrorType.TOKEN_INVALID);
      expect(result.tokenDeleted).toBe(false);
      expect(result.requiresReauth).toBe(true);
    });
  });
});
