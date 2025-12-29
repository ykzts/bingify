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

  it("should redirect to login with error when code parameter is empty", async () => {
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

  it("should redirect to login with error when code parameter contains only whitespace", async () => {
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

  it("should redirect to localized login with error when code is missing and referer has locale", async () => {
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

  it("should redirect to login with error when session exchange fails", async () => {
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

  it("should redirect to dashboard on successful authentication", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("should redirect to localized dashboard on successful authentication with locale in referer", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/ja/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/ja/`);
  });

  it("should handle missing referer header gracefully", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`);

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("should handle malformed referer URL gracefully", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: "not-a-valid-url",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("should ignore invalid locale in referer and redirect to non-localized path", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const request = new NextRequest(`${origin}/auth/callback?code=valid_code`, {
      headers: {
        referer: `${origin}/xyz/login`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("should handle malformed referer URL on authentication error", async () => {
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

  it("should ignore invalid locale in referer on authentication error", async () => {
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

  it("should redirect to specified path when redirect parameter is provided", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
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
    expect(response.headers.get("location")).toBe(`${origin}/dashboard`);
  });

  it("should redirect to localized specified path when redirect parameter is provided with locale", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
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
    expect(response.headers.get("location")).toBe(`${origin}/ja/admin`);
  });

  it("should handle redirect parameter with locale already included", async () => {
    const mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
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
    expect(response.headers.get("location")).toBe(`${origin}/ja/dashboard`);
  });
});
