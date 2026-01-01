import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables } from "@/types/supabase";
import { getSpace, getSpaceByShareKey, getSpaces, validateSpaceData } from "../spaces";

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("getSpace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return space with validated JSONB columns", async () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: {
        email: {
          allowed: ["@example.com"],
        },
      },
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: {
        hide_metadata_before_join: true,
      },
      share_key: "test-key",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpaceData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpace("test-id");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-id");
    expect(result?.settings).toEqual({ hide_metadata_before_join: true });
    expect(result?.gatekeeper_rules).toEqual({
      email: { allowed: ["@example.com"] },
    });
  });

  it("should return null when space not found", async () => {
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

    const result = await getSpace("non-existent-id");

    expect(result).toBeNull();
  });

  it("should handle invalid JSONB data with null fallback", async () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: "invalid string data" as any, // Invalid type (string instead of object)
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: "invalid string" as any, // Invalid type (string instead of object)
      share_key: "test-key",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpaceData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpace("test-id");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-id");
    // Invalid data should fall back to null
    expect(result?.settings).toBeNull();
    expect(result?.gatekeeper_rules).toBeNull();
  });

  it("should handle null JSONB columns", async () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: null,
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: null,
      share_key: "test-key",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpaceData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpace("test-id");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("test-id");
    expect(result?.settings).toBeNull();
    expect(result?.gatekeeper_rules).toBeNull();
  });
});

describe("getSpaceByShareKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return space when found by share key", async () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: null,
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: null,
      share_key: "test-key-20240101",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSpaceData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSpaceByShareKey("test-key-20240101");

    expect(result).not.toBeNull();
    expect(result?.share_key).toBe("test-key-20240101");
  });

  it("should return null when space not found by share key", async () => {
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

    const result = await getSpaceByShareKey("non-existent-key");

    expect(result).toBeNull();
  });
});

describe("getSpaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty ids", async () => {
    const result = await getSpaces([]);

    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("should return multiple spaces with validated JSONB columns", async () => {
    const mockSpacesData: Tables<"spaces">[] = [
      {
        created_at: "2024-01-01T00:00:00Z",
        description: "Test space 1",
        gatekeeper_rules: null,
        id: "test-id-1",
        max_participants: 50,
        owner_id: "owner-id",
        settings: { hide_metadata_before_join: false },
        share_key: "test-key-1",
        status: "active",
        title: "Test Space 1",
        updated_at: "2024-01-01T00:00:00Z",
        view_token: "view-token-1",
      },
      {
        created_at: "2024-01-02T00:00:00Z",
        description: "Test space 2",
        gatekeeper_rules: { youtube: { channelId: "UC123", requirement: "subscriber" } },
        id: "test-id-2",
        max_participants: 100,
        owner_id: "owner-id",
        settings: null,
        share_key: "test-key-2",
        status: "draft",
        title: "Test Space 2",
        updated_at: "2024-01-02T00:00:00Z",
        view_token: "view-token-2",
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: mockSpacesData,
          error: null,
        }),
      }),
    });

    const result = await getSpaces(["test-id-1", "test-id-2"]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("test-id-1");
    expect(result[1].id).toBe("test-id-2");
    expect(result[0].settings).toEqual({ hide_metadata_before_join: false });
    expect(result[1].gatekeeper_rules).toEqual({ youtube: { channelId: "UC123", requirement: "subscriber" } });
  });

  it("should return empty array on error", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    });

    const result = await getSpaces(["test-id-1"]);

    expect(result).toEqual([]);
  });
});

describe("validateSpaceData", () => {
  it("should validate valid JSONB data", () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: {
        email: {
          allowed: ["@example.com"],
        },
      },
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: {
        hide_metadata_before_join: true,
      },
      share_key: "test-key",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    const result = validateSpaceData(mockSpaceData);

    expect(result.settings).toEqual({ hide_metadata_before_join: true });
    expect(result.gatekeeper_rules).toEqual({
      email: { allowed: ["@example.com"] },
    });
  });

  it("should return null for invalid JSONB data", () => {
    const mockSpaceData: Tables<"spaces"> = {
      created_at: "2024-01-01T00:00:00Z",
      description: "Test space",
      gatekeeper_rules: "invalid string" as any, // Invalid type (string instead of object/null)
      id: "test-id",
      max_participants: 50,
      owner_id: "owner-id",
      settings: 123 as any, // Invalid type (number instead of object/null)
      share_key: "test-key",
      status: "active",
      title: "Test Space",
      updated_at: "2024-01-01T00:00:00Z",
      view_token: "view-token",
    };

    const result = validateSpaceData(mockSpaceData);

    expect(result.settings).toBeNull();
    expect(result.gatekeeper_rules).toBeNull();
  });
});
