import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

// Supabase クライアントのモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

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

describe("通知クリーンアップCronエンドポイント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数を設定
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("認証が成功し、期限切れの通知を削除する", async () => {
    const mockSupabase = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(5);
    expect(data.timestamp).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    expect(mockSupabase.delete).toHaveBeenCalledWith({ count: "exact" });
    expect(mockSupabase.lt).toHaveBeenCalled();
  });

  it("削除対象の通知がない場合にdeleted: 0を返す", async () => {
    const mockSupabase = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(0);
    expect(data.timestamp).toBeDefined();
  });

  it("countがnullの場合に0を返す", async () => {
    const mockSupabase = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        count: null,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(0);
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
    // biome-ignore lint/performance/noDelete: テストで未定義の環境変数を確認するために必要
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
    // biome-ignore lint/performance/noDelete: テストで未定義の環境変数を確認するために必要
    delete process.env.CRON_SECRET;
    vi.stubEnv("NODE_ENV", "development");

    const mockSupabase = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        count: 2,
        error: null,
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(2);

    // 環境変数を復元
    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    }
    vi.unstubAllEnvs();
    if (originalNodeEnv) {
      vi.stubEnv("NODE_ENV", originalNodeEnv);
    }
  });

  it("NEXT_PUBLIC_SUPABASE_URLが設定されていない場合にエラーを返す", async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // biome-ignore lint/performance/noDelete: テストで未定義の環境変数を確認するために必要
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

  it("SUPABASE_SERVICE_ROLE_KEYが設定されていない場合にエラーを返す", async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // biome-ignore lint/performance/noDelete: テストで未定義の環境変数を確認するために必要
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
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        count: null,
        error: { message: "Database connection failed" },
      }),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as never);

    const request = createMockRequest("Bearer test-cron-secret");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete expired notifications");
  });

  it("予期しないエラーを適切に処理する", async () => {
    const mockSupabase = {
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      lt: vi.fn().mockImplementation(() => {
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
