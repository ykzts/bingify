import { beforeEach, describe, expect, test, vi } from "vitest";
import { getSpacePublicInfo } from "../actions";

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock privacy utilities
vi.mock("@/lib/privacy", () => ({
  maskEmailPatterns: vi.fn((patterns: string[]) =>
    patterns.map((p) =>
      p.startsWith("@") ? p : `${p[0]}***@${p.split("@")[1]}`
    )
  ),
}));

describe("getSpacePublicInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return null for invalid UUID", async () => {
    const result = await getSpacePublicInfo("invalid-uuid");
    expect(result).toBeNull();
  });

  test("should return null when space not found", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(result).toBeNull();
  });

  test("should return space info with masked emails for active space", async () => {
    const mockSpace = {
      description: "Test space description",
      gatekeeper_rules: {
        email: {
          allowed: ["user@example.com", "@company.com"],
        },
        youtube: {
          channelId: "UCtest123",
          requirement: "subscriber",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: false,
      },
      share_key: "test-space",
      status: "active",
      title: "Test Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Space");
    expect(result?.status).toBe("active");
    expect(result?.hideMetadata).toBe(false);
    expect(result?.gatekeeper_rules?.email?.allowed).toEqual([
      "u***@example.com",
      "@company.com",
    ]);
    expect(result?.gatekeeper_rules?.youtube?.requirement).toBe("subscriber");
  });

  test("should return space info for draft space with status", async () => {
    const mockSpace = {
      description: "Draft space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "draft-space",
      status: "draft",
      title: "Draft Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("draft");
    expect(result?.hideMetadata).toBe(false);
  });

  test("should respect hide_metadata_before_join setting", async () => {
    const mockSpace = {
      description: "Private space",
      gatekeeper_rules: null,
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {
        hide_metadata_before_join: true,
      },
      share_key: "private-space",
      status: "active",
      title: "Private Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.hideMetadata).toBe(true);
  });

  test("should return null gatekeeper_rules when all rules are none", async () => {
    const mockSpace = {
      description: "Space with no restrictions",
      gatekeeper_rules: {
        youtube: {
          channelId: "UCtest",
          requirement: "none",
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "open-space",
      status: "active",
      title: "Open Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules).toBeNull();
  });

  test("should handle legacy YouTube format", async () => {
    const mockSpace = {
      description: "Legacy YouTube",
      gatekeeper_rules: {
        youtube: {
          channelId: "UCtest",
          required: true,
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "legacy-space",
      status: "active",
      title: "Legacy Space",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules?.youtube?.requirement).toBe("subscriber");
  });

  test("should handle legacy Twitch format", async () => {
    const mockSpace = {
      description: "Legacy Twitch",
      gatekeeper_rules: {
        twitch: {
          broadcasterId: "12345",
          requireFollow: true,
        },
      },
      id: "123e4567-e89b-12d3-a456-426614174000",
      settings: {},
      share_key: "legacy-twitch",
      status: "active",
      title: "Legacy Twitch",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpace,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpacePublicInfo(
      "123e4567-e89b-12d3-a456-426614174000"
    );

    expect(result).not.toBeNull();
    expect(result?.gatekeeper_rules?.twitch?.requirement).toBe("follower");
  });
});
