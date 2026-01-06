import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

// Supabase クライアントのモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// fetchのモック
global.fetch = vi.fn();

// NextRequest のモック作成ヘルパー
function createMockRequest(authHeader?: string): NextRequest {
  return {
    headers: {
      get: vi.fn((name: string) => {
        if (name === "authorization") {
          return authHeader || null;
        }
        return null;
      }),
    },
  } as unknown as NextRequest;
}

describe("Token Refresh Cron Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数を設定
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = "google-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET = "google-secret";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID = "twitch-client-id";
    process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET = "twitch-secret";
  });

  it("認証が成功し、トークンがない場合に正常終了する", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(0);
    expect(data.data.message).toContain("No tokens found");
    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_expired_oauth_tokens");
  });

  it("期限切れのトークンを正常にリフレッシュする", async () => {
    const mockTokens = [
      {
        expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        lock_key: 123_456_789,
        provider: "google",
        refresh_token_secret_id: "secret-1",
        user_id: "user-1",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi
        .fn()
        .mockResolvedValueOnce({
          // get_expired_oauth_tokens
          data: mockTokens,
          error: null,
        })
        .mockResolvedValueOnce({
          // get_oauth_token_for_user
          data: {
            data: { refresh_token: "refresh_token_value" },
            success: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // upsert_oauth_token_for_user
          data: { success: true },
          error: null,
        })
        .mockResolvedValueOnce({
          // release_oauth_token_lock
          data: true,
          error: null,
        }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    // OAuth refresh endpoint mock
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        access_token: "new_access_token",
        expires_in: 3600,
      }),
      ok: true,
    } as Response);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(1);
    expect(data.data.refreshed).toBe(1);
    expect(data.data.failed).toBe(0);
  });

  it("リフレッシュに失敗したトークンを記録する", async () => {
    const mockTokens = [
      {
        expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        lock_key: 123_456_789,
        provider: "google",
        refresh_token_secret_id: "secret-1",
        user_id: "user-1",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi
        .fn()
        .mockResolvedValueOnce({
          // get_expired_oauth_tokens
          data: mockTokens,
          error: null,
        })
        .mockResolvedValueOnce({
          // get_oauth_token_for_user
          data: {
            data: { refresh_token: "refresh_token_value" },
            success: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          // release_oauth_token_lock
          data: true,
          error: null,
        }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    // OAuth refresh endpoint mock - failure
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Token expired",
    } as Response);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(1);
    expect(data.data.refreshed).toBe(0);
    expect(data.data.failed).toBe(1);
    expect(data.data.failedTokens).toHaveLength(1);
  });

  it("認証ヘッダーがない場合に401を返す", async () => {
    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("認証ヘッダーが無効な場合に401を返す", async () => {
    const request = createMockRequest("Bearer invalid-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("CRON_SECRETが設定されていない場合（本番環境）にエラーを返す", async () => {
    const originalSecret = process.env.CRON_SECRET;
    const originalNodeEnv = process.env.NODE_ENV;
    // biome-ignore lint/performance/noDelete: Required for testing undefined environment variables
    delete process.env.CRON_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing CRON_SECRET");

    // 環境変数を復元
    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    }
    vi.unstubAllEnvs();
    if (originalNodeEnv) {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    }
  });

  it("CRON_SECRETが設定されていない場合（開発環境）に警告を出すが処理を続行する", async () => {
    const originalSecret = process.env.CRON_SECRET;
    const originalNodeEnv = process.env.NODE_ENV;
    // biome-ignore lint/performance/noDelete: Required for testing undefined environment variables
    delete process.env.CRON_SECRET;
    vi.stubEnv("NODE_ENV", "development");

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(0);

    // 環境変数を復元
    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    }
    vi.unstubAllEnvs();
    if (originalNodeEnv) {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    }
  });

  it("SUPABASE_URLが設定されていない場合にエラーを返す", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // biome-ignore lint/performance/noDelete: Required for testing undefined environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing NEXT_PUBLIC_SUPABASE_URL");

    // 環境変数を復元
    if (originalUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
  });

  it("SERVICE_ROLE_KEYが設定されていない場合にエラーを返す", async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // biome-ignore lint/performance/noDelete: Required for testing undefined environment variables
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing SUPABASE_SERVICE_ROLE_KEY");

    // 環境変数を復元
    if (originalKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  it("データベースエラー時にエラーを返す", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch tokens");
  });

  it("予期しないエラーを適切に処理する", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockImplementation(() => {
        throw new Error("Unexpected error");
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
