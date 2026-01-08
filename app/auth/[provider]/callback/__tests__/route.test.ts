import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock the OAuth token storage
vi.mock("@/lib/oauth/token-storage", () => ({
  upsertOAuthToken: vi.fn(),
}));

import { upsertOAuthToken } from "@/lib/oauth/token-storage";
// Import after mocks
import { createClient } from "@/lib/supabase/server";
import { GET } from "../route";

describe("Auth [Provider] Callback Route", () => {
  const origin = "http://localhost:3000";

  // Helper to create mock context
  const createContext = (provider: string) => ({
    params: Promise.resolve({ provider }),
  });

  it("無効なプロバイダーの場合エラー付きでログインにリダイレクトする", async () => {
    const request = new NextRequest(
      `${origin}/auth/invalid/callback?code=valid_code`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request, createContext("invalid"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("should redirect to login with error when code parameter is missing", async () => {
    const request = new NextRequest(`${origin}/auth/google/callback`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request, createContext("google"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("codeパラメータが空の場合エラー付きでログインにリダイレクトする", async () => {
    const request = new NextRequest(`${origin}/auth/twitch/callback?code=`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request, createContext("twitch"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("セッション交換が失敗した場合エラー付きでログインにリダイレクトする", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi
          .fn()
          .mockResolvedValue({ error: new Error("Invalid code") }),
      },
    } as any);

    const request = new NextRequest(
      `${origin}/auth/google/callback?code=invalid_code`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request, createContext("google"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("セッションリフレッシュが失敗した場合エラー付きでログインにリダイレクトする", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error("Failed to refresh session"),
        }),
      },
    } as any);

    const request = new NextRequest(
      `${origin}/auth/twitch/callback?code=valid_code`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request, createContext("twitch"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("認証成功時にダッシュボードにリダイレクトする", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest(
      `${origin}/auth/google/callback?code=valid_code`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request, createContext("google"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("redirectパラメータが指定されている場合指定されたパスにリダイレクトする", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    } as any);

    const request = new NextRequest(
      `${origin}/auth/twitch/callback?code=valid_code&redirect=/dashboard`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request, createContext("twitch"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/dashboard`);
  });

  describe("OAuth Token Storage", () => {
    it("URLから取得したプロバイダーでOAuthトークンを保存する", async () => {
      const mockUpsertOAuthToken = vi.mocked(upsertOAuthToken);
      mockUpsertOAuthToken.mockResolvedValue({ success: true });

      const mockCreateClient = vi.mocked(createClient);
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          refreshSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: 1_234_567_890,
                provider_refresh_token: "mock-refresh-token",
                provider_token: "mock-access-token",
                user: {
                  app_metadata: { provider: "twitch" },
                  id: "user-123",
                },
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest(
        `${origin}/auth/google/callback?code=valid_code`,
        {
          headers: {
            referer: `${origin}/login`,
          },
        }
      );

      const response = await GET(request, createContext("google"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}/`);
      // URLから取得したプロバイダー(google)が使用されることを確認
      // app_metadata.provider(twitch)ではなく、URLのプロバイダーが優先される
      expect(mockUpsertOAuthToken).toHaveBeenCalledWith(mockSupabase, {
        access_token: "mock-access-token",
        expires_at: null, // No provider-specific expiry fields in mock
        provider: "google",
        refresh_token: "mock-refresh-token",
      });
    });

    it("Twitchプロバイダーのトークンを正しく保存する", async () => {
      const mockUpsertOAuthToken = vi.mocked(upsertOAuthToken);
      mockUpsertOAuthToken.mockResolvedValue({ success: true });

      const mockCreateClient = vi.mocked(createClient);
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          refreshSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: 1_234_567_890,
                provider_refresh_token: "mock-twitch-refresh",
                provider_token: "mock-twitch-token",
                user: {
                  app_metadata: { provider: "google" },
                  id: "user-123",
                },
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest(
        `${origin}/auth/twitch/callback?code=valid_code`,
        {
          headers: {
            referer: `${origin}/login`,
          },
        }
      );

      const response = await GET(request, createContext("twitch"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}/`);
      // URLから取得したプロバイダー(twitch)が使用されることを確認
      // app_metadata.provider(google)の古いキャッシュ値ではなく、URLから取得
      expect(mockUpsertOAuthToken).toHaveBeenCalledWith(mockSupabase, {
        access_token: "mock-twitch-token",
        expires_at: null, // No provider-specific expiry fields in mock
        provider: "twitch",
        refresh_token: "mock-twitch-refresh",
      });
    });

    it("provider_tokenが欠落している場合トークン保存をスキップする", async () => {
      const mockUpsertOAuthToken = vi.mocked(upsertOAuthToken);
      mockUpsertOAuthToken.mockClear();

      const mockCreateClient = vi.mocked(createClient);
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          refreshSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: 1_234_567_890,
                provider_refresh_token: null,
                provider_token: null,
                user: {
                  app_metadata: { provider: "google" },
                  id: "user-123",
                },
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest(
        `${origin}/auth/google/callback?code=valid_code`,
        {
          headers: {
            referer: `${origin}/login`,
          },
        }
      );

      const response = await GET(request, createContext("google"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}/`);
      expect(mockUpsertOAuthToken).not.toHaveBeenCalled();
    });

    it("トークン保存が失敗しても認証フローを継続する", async () => {
      const mockUpsertOAuthToken = vi.mocked(upsertOAuthToken);
      mockUpsertOAuthToken.mockResolvedValue({
        error: "Database error",
        success: false,
      });

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Mock implementation intentionally does nothing
        .mockImplementation(() => {});

      const mockCreateClient = vi.mocked(createClient);
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          refreshSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: 1_234_567_890,
                provider_refresh_token: "mock-refresh-token",
                provider_token: "mock-access-token",
                user: {
                  app_metadata: { provider: "twitch" },
                  id: "user-123",
                },
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase as any);

      const request = new NextRequest(
        `${origin}/auth/twitch/callback?code=valid_code`,
        {
          headers: {
            referer: `${origin}/login`,
          },
        }
      );

      const response = await GET(request, createContext("twitch"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`${origin}/`);
      expect(mockUpsertOAuthToken).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to store OAuth token"),
        "Database error"
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
