import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemSettings } from "../system-settings";

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

describe("getSystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return validated system settings", async () => {
    const mockData = {
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: { enabled: true },
          youtube: { enabled: true },
        },
      },
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSystemSettings();

    expect(result.error).toBeUndefined();
    expect(result.settings).toEqual({
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: { enabled: true },
          youtube: { enabled: true },
        },
      },
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
    });
  });

  it("should return error when database query fails", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      }),
    });

    const result = await getSystemSettings();

    expect(result.error).toBe("errorFetchFailed");
    expect(result.settings).toBeUndefined();
  });

  it("should use defaults for invalid features and return warnings", async () => {
    const mockData = {
      default_user_role: "organizer",
      features: { invalid: "structure" }, // Invalid features structure
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSystemSettings();

    expect(result.error).toBeUndefined();
    expect(result.settings).toBeDefined();
    expect(result.warnings).toContain("features");
    expect(result.settings?.features).toEqual({
      gatekeeper: {
        email: { enabled: true },
        twitch: { enabled: true },
        youtube: { enabled: true },
      },
    });
  });

  it("should use defaults for invalid numeric values and return warnings", async () => {
    const mockData = {
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: { enabled: true },
          youtube: { enabled: true },
        },
      },
      max_participants_per_space: -1, // Invalid negative value
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      }),
    });

    const result = await getSystemSettings();

    expect(result.error).toBeUndefined();
    expect(result.settings).toBeDefined();
    expect(result.warnings).toContain("max_participants_per_space");
    expect(result.settings?.max_participants_per_space).toBe(50); // default value
  });

  it("should handle unexpected errors gracefully", async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await getSystemSettings();

    expect(result.error).toBe("errorGeneric");
    expect(result.settings).toBeUndefined();
  });
});
