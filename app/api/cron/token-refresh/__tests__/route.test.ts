import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tokenRefresh from "@/lib/oauth/token-refresh";
import { GET } from "../route";

// Supabase クライアントのモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// token-refresh モジュールのモック
vi.mock("@/lib/oauth/token-refresh", () => ({
  refreshOAuthToken: vi.fn(),
}));

// NextRequest のモック作成ヘルパー
function createMockRequest(authHeader?: string) {
  return {
    headers: {
      get: vi.fn((name: string) => {
        if (name === "authorization") {
          return authHeader || null;
        }
        return null;
      }),
    },
  } as unknown as Request;
}

describe("Token Refresh Cron Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数を設定
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("認証が成功し、トークンがない場合に正常終了する", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
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
  });

  it("期限切れのトークンを正常にリフレッシュする", async () => {
    const mockTokens = [
      {
        expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        provider: "google",
        user_id: "user-1",
      },
      {
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        provider: "twitch",
        user_id: "user-2",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: mockTokens,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    // refreshOAuthToken のモック
    vi.mocked(tokenRefresh.refreshOAuthToken)
      .mockResolvedValueOnce({
        provider: "google",
        refreshed: true,
      })
      .mockResolvedValueOnce({
        provider: "twitch",
        refreshed: true,
      });

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(2);
    expect(data.data.refreshed).toBe(2);
    expect(data.data.failed).toBe(0);
    expect(data.data.skipped).toBe(0);
  });

  it("リフレッシュに失敗したトークンを記録する", async () => {
    const mockTokens = [
      {
        expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        provider: "google",
        user_id: "user-1",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: mockTokens,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    vi.mocked(tokenRefresh.refreshOAuthToken).mockResolvedValueOnce({
      error: "Token refresh failed",
      provider: "google",
      refreshed: false,
    });

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(1);
    expect(data.data.refreshed).toBe(0);
    expect(data.data.failed).toBe(1);
    expect(data.data.failedTokens).toHaveLength(1);
    expect(data.data.failedTokens[0].error).toBe("Token refresh failed");
  });

  it("スキップされたトークンをカウントする", async () => {
    const mockTokens = [
      {
        expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        provider: "google",
        user_id: "user-1",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: mockTokens,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    vi.mocked(tokenRefresh.refreshOAuthToken).mockResolvedValueOnce({
      error: "No refresh token available",
      provider: "google",
      refreshed: false,
      skipped: true,
    });

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(1);
    expect(data.data.refreshed).toBe(0);
    expect(data.data.skipped).toBe(1);
    expect(data.data.failed).toBe(0);
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
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "production";

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing CRON_SECRET");
  });

  it("CRON_SECRETが設定されていない場合（開発環境）に警告を出すが処理を続行する", async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "development";

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
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
  });

  it("SUPABASE_URLが設定されていない場合にエラーを返す", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing NEXT_PUBLIC_SUPABASE_URL");
  });

  it("SERVICE_ROLE_KEYが設定されていない場合にエラーを返す", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing SUPABASE_SERVICE_ROLE_KEY");
  });

  it("データベースエラー時にエラーを返す", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
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
      from: vi.fn().mockImplementation(() => {
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
