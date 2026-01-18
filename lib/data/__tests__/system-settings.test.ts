import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemSettings } from "../system-settings";

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => {
    const translations: Record<string, string> = {
      errorFetchFailed: "Failed to fetch settings",
      errorGeneric: "An error occurred",
      errorInvalidData: "Invalid data",
      errorNoData: "No data found",
    };
    return (key: string) => translations[key] || key;
  }),
}));

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

  it("検証されたシステム設定を返す", async () => {
    const mockData = {
      archive_retention_hours: 168,
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
      spaces_archive_retention_hours: 2160,
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
      archive_retention_hours: 168,
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
        },
      },
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
      spaces_archive_retention_hours: 2160,
    });
  });

  it("データベースクエリが失敗した場合にエラーを返す", async () => {
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

    expect(result.error).toBe("Failed to fetch settings");
    expect(result.settings).toBeUndefined();
  });

  it("無効な機能に対してデフォルトを使用し警告を返す", async () => {
    const mockData = {
      archive_retention_hours: 168,
      default_user_role: "organizer",
      features: { invalid: "structure" }, // Invalid features structure
      max_participants_per_space: 1000,
      max_spaces_per_user: 10,
      max_total_spaces: 100,
      space_expiration_hours: 72,
      spaces_archive_retention_hours: 2160,
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
        twitch: {
          enabled: true,
          follower: { enabled: true },
          subscriber: { enabled: true },
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    });
  });

  it("無効な非機能フィールドに対してエラーを返す", async () => {
    const mockData = {
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: {
            enabled: true,
            follower: { enabled: true },
            subscriber: { enabled: true },
          },
          youtube: {
            enabled: true,
            member: { enabled: true },
            subscriber: { enabled: true },
          },
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

    // Should return error since non-features fields are invalid
    expect(result.error).toBe("Invalid data");
    expect(result.settings).toBeUndefined();
  });

  it("予期しないエラーを適切に処理する", async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await getSystemSettings();

    expect(result.error).toBe("An error occurred");
    expect(result.settings).toBeUndefined();
  });
});
