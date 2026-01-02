import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("GET /api/system/auth-providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return enabled auth providers sorted by provider name", async () => {
    const mockData = [
      { label: "Google", provider: "google" },
      { label: "Twitch", provider: "twitch" },
    ];

    mockSupabase.from.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
      select: vi.fn().mockReturnThis(),
    });

    const request = new Request(
      "http://localhost:3000/api/system/auth-providers"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      providers: [
        { label: "Google", provider: "google" },
        { label: "Twitch", provider: "twitch" },
      ],
    });
  });

  it("should use provider name as label if label is null", async () => {
    const mockData = [{ label: null, provider: "discord" }];

    mockSupabase.from.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      }),
      select: vi.fn().mockReturnThis(),
    });

    const request = new Request(
      "http://localhost:3000/api/system/auth-providers"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.providers[0].label).toBe("discord");
  });

  it("should return 500 when database query fails", async () => {
    mockSupabase.from.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
      select: vi.fn().mockReturnThis(),
    });

    const request = new Request(
      "http://localhost:3000/api/system/auth-providers"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch auth providers" });
  });

  it("should return empty array when no enabled providers exist", async () => {
    mockSupabase.from.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      select: vi.fn().mockReturnThis(),
    });

    const request = new Request(
      "http://localhost:3000/api/system/auth-providers"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ providers: [] });
  });

  it("should handle unexpected errors gracefully", async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const request = new Request(
      "http://localhost:3000/api/system/auth-providers"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Internal server error" });
  });
});
