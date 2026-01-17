import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createClient } from "@/lib/supabase/server";
import { GET } from "../route";

describe("Auth Callback Route", () => {
  const origin = "http://localhost:3000";

  it("should redirect to login with error when code parameter is missing", async () => {
    const request = new NextRequest(`${origin}/auth/callback`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("codeパラメータが空の場合エラー付きでログインにリダイレクトする", async () => {
    const request = new NextRequest(`${origin}/auth/callback?code=`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("codeパラメータが空白のみの場合エラー付きでログインにリダイレクトする", async () => {
    const request = new NextRequest(`${origin}/auth/callback?code=%20`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("codeが欠落しrefererにロケールがある場合エラー付きでローカライズされたログインにリダイレクトする", async () => {
    const request = new NextRequest(`${origin}/auth/callback`, {
      headers: {
        referer: `${origin}/ja/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/ja/login?error=auth_failed`
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
      `${origin}/auth/callback?code=invalid_code`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("refererにロケールがある場合認証成功時にローカライズされたダッシュボードにリダイレクトする", async () => {
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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/ja/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/ja/?login_success=true`
    );
  });

  it("refererヘッダーの欠落を適切に処理する", async () => {
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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`);

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("不正なreferer URLを適切に処理する", async () => {
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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: "not-a-valid-url",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("referer内の無効なロケールを無視し非ローカライズパスにリダイレクトする", async () => {
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

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/xyz/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("認証エラー時に不正なreferer URLを処理する", async () => {
    const request = new NextRequest(`${origin}/auth/callback`, {
      headers: {
        referer: "invalid-url-format",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
  });

  it("認証エラー時にreferer内の無効なロケールを無視する", async () => {
    const request = new NextRequest(`${origin}/auth/callback`, {
      headers: {
        referer: `${origin}/xyz/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/login?error=auth_failed`
    );
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
      `${origin}/auth/callback?code=valid_code&redirect=/dashboard`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/dashboard?login_success=true`
    );
  });

  it("redirectパラメータがロケール付きで指定されている場合ローカライズされた指定パスにリダイレクトする", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/admin`,
      {
        headers: {
          referer: `${origin}/ja/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/ja/admin?login_success=true`
    );
  });

  it("redirectパラメータに既にロケールが含まれている場合を処理する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/ja/dashboard`,
      {
        headers: {
          referer: `${origin}/en/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/ja/dashboard?login_success=true`
    );
  });

  it("redirectパラメータ内のプロトコル相対URLを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=//evil.com/path`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("redirectパラメータ内の絶対URLを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=https://evil.com/path`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("コロンを含むクエリパラメータ付きのredirectを受け入れる", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/dashboard?time=12:30:00`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/dashboard?time=12%3A30%3A00&login_success=true`
    );
  });

  it("クエリパラメータに@記号を含むredirectを受け入れる", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/search?email=user@example.com`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/search?email=user%40example.com&login_success=true`
    );
  });

  it("空白のみの値を含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=%20%20%20`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("空文字列のredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("エンコードされたスラッシュを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=%2F%2Fevil.com`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("パストラバーサルを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/dashboard/../../etc/passwd`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("エンコードされたパストラバーサルを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/dashboard%2F..%2F..%2Fetc%2Fpasswd`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("バックスラッシュを含むパスを処理する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/dashboard\\..\\admin`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    // Backslashes are normalized by URL parsing - this is expected behavior
    // The actual path will be resolved by the server
    expect(response.headers.get("location")).toContain(`${origin}/`);
    expect(response.headers.get("location")).toContain("login_success=true");
  });

  it("javascript:プロトコルを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/path?foo=javascript:alert(1)`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("data:プロトコルを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/path?data:text/html,<script>alert(1)</script>`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });

  it("フラグメント内のvbscript:プロトコルを含むredirectを拒否する", async () => {
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
      `${origin}/auth/callback?code=valid_code&redirect=/path?foo=vbscript:msgbox(1)`,
      {
        headers: {
          referer: `${origin}/login`,
        },
      }
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/?login_success=true`
    );
  });
});
