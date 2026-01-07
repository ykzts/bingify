import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSpaceSettings } from "../settings-actions";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/utils/uuid", () => ({
  isValidUUID: vi.fn(),
}));

vi.mock("@tanstack/react-form-nextjs", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createServerValidate: vi.fn(() => vi.fn()),
    initialFormState: {
      errors: [],
      errorMap: {},
      values: {},
    },
  };
});

describe("updateSpaceSettings - ゲートキーパー設定の権限制御", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("オーナーはゲートキーパー設定を変更できる", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      gatekeeper_rules: null,
      max_participants: 50,
      owner_id: "owner-123",
      settings: {},
    };

    const mockSystemSettings = {
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
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-123" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            })),
          };
        }
        if (tableName === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        if (tableName === "system_settings") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSystemSettings,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (tableName === "participants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const formData = new FormData();
    formData.set("title", "Test Space");
    formData.set("description", "Test Description");
    formData.set("max_participants", "50");
    formData.set("gatekeeper_mode", "email");
    formData.set("email_allowlist", "user@example.com");
    formData.set("social_platform", "youtube");
    formData.set("youtube_requirement", "none");
    formData.set("youtube_channel_id", "");
    formData.set("twitch_requirement", "none");
    formData.set("twitch_broadcaster_id", "");

    const result = await updateSpaceSettings("space-123", undefined, formData);

    // Check that meta.success is true
    expect((result as { meta?: { success?: boolean } }).meta?.success).toBe(
      true
    );
  });

  it("管理者がゲートキーパー設定を変更しようとすると拒否される", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      gatekeeper_rules: null,
      max_participants: 50,
      owner_id: "owner-123",
      settings: {},
    };

    const mockAdminRole = {
      id: "admin-role-id",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-456" } }, // Different user (admin)
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (tableName === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: mockAdminRole,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const formData = new FormData();
    formData.set("title", "Test Space");
    formData.set("description", "Test Description");
    formData.set("max_participants", "50");
    formData.set("gatekeeper_mode", "email");
    formData.set("email_allowlist", "user@example.com");
    formData.set("social_platform", "youtube");
    formData.set("youtube_requirement", "none");
    formData.set("youtube_channel_id", "");
    formData.set("twitch_requirement", "none");
    formData.set("twitch_broadcaster_id", "");

    const result = await updateSpaceSettings("space-123", undefined, formData);

    expect((result as { errors?: string[] }).errors).toContain(
      "errorGatekeeperOwnerOnly"
    );
  });

  it("管理者はゲートキーパー以外の設定を変更できる", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      gatekeeper_rules: null,
      max_participants: 50,
      owner_id: "owner-123",
      settings: {},
    };

    const mockAdminRole = {
      id: "admin-role-id",
    };

    const mockSystemSettings = {
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
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-456" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            })),
          };
        }
        if (tableName === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: mockAdminRole,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        if (tableName === "system_settings") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSystemSettings,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (tableName === "participants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const formData = new FormData();
    formData.set("title", "Updated Title");
    formData.set("description", "Updated Description");
    formData.set("max_participants", "60");
    formData.set("gatekeeper_mode", "none"); // Not changing (was null, will be null)
    formData.set("email_allowlist", "");
    formData.set("social_platform", "youtube");
    formData.set("youtube_requirement", "none");
    formData.set("youtube_channel_id", "");
    formData.set("twitch_requirement", "none");
    formData.set("twitch_broadcaster_id", "");

    const result = await updateSpaceSettings("space-123", undefined, formData);

    // Check that meta.success is true
    expect((result as { meta?: { success?: boolean } }).meta?.success).toBe(
      true
    );
  });

  it("管理者が既存のゲートキーパー設定を保持したまま他の設定を変更できる", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      gatekeeper_rules: {
        email: {
          allowed: ["user@example.com"],
        },
      },
      max_participants: 50,
      owner_id: "owner-123",
      settings: {},
    };

    const mockAdminRole = {
      id: "admin-role-id",
    };

    const mockSystemSettings = {
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
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-456" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            })),
          };
        }
        if (tableName === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: mockAdminRole,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        if (tableName === "system_settings") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSystemSettings,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (tableName === "participants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const formData = new FormData();
    formData.set("title", "Updated Title");
    formData.set("description", "Updated Description");
    formData.set("max_participants", "60");
    formData.set("gatekeeper_mode", "email"); // Keep the same
    formData.set("email_allowlist", "user@example.com"); // Keep the same
    formData.set("social_platform", "youtube");
    formData.set("youtube_requirement", "none");
    formData.set("youtube_channel_id", "");
    formData.set("twitch_requirement", "none");
    formData.set("twitch_broadcaster_id", "");

    const result = await updateSpaceSettings("space-123", undefined, formData);

    // Check that meta.success is true
    expect((result as { meta?: { success?: boolean } }).meta?.success).toBe(
      true
    );
  });
});
