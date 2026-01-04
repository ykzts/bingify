import { describe, expect, it, vi } from "vitest";
import { getScreenSettings, updateScreenSettings } from "../screen-settings";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getScreenSettings", () => {
  it("should fetch screen settings for a space", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  background: "blue",
                  display_mode: "minimal",
                  locale: "ja",
                  theme: "light",
                },
                error: null,
              })
            ),
          })),
        })),
      })),
    } as never);

    const settings = await getScreenSettings("space-123");

    expect(settings).toEqual({
      background: "blue",
      display_mode: "minimal",
      locale: "ja",
      theme: "light",
    });
  });

  it("should return null if settings not found", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Not found" },
              })
            ),
          })),
        })),
      })),
    } as never);

    const settings = await getScreenSettings("space-123");
    expect(settings).toBeNull();
  });
});

describe("updateScreenSettings", () => {
  it("should update screen settings successfully", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockSupabase = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: { id: "user-123" } },
            error: null,
          })
        ),
      },
      from: vi.fn((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: "space-123", owner_id: "user-123" },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        if (table === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: null,
                      error: { message: "Not found" },
                    })
                  ),
                })),
              })),
            })),
          };
        }
        if (table === "screen_settings") {
          return {
            upsert: vi.fn(() =>
              Promise.resolve({
                error: null,
              })
            ),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await updateScreenSettings("space-123", {
      background: "blue",
      display_mode: "minimal",
      locale: "ja",
      theme: "light",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return error if user is not owner or admin", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockSupabase = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: { id: "user-456" } },
            error: null,
          })
        ),
      },
      from: vi.fn((table: string) => {
        if (table === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: "space-123", owner_id: "user-123" },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        if (table === "space_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() =>
                    Promise.resolve({
                      data: null,
                      error: { message: "Not found" },
                    })
                  ),
                })),
              })),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await updateScreenSettings("space-123", {
      background: "green",
      display_mode: "minimal",
      theme: "light",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Permission denied");
  });

  it("should return error if space not found", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Not found" },
              })
            ),
          })),
        })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await updateScreenSettings("space-123", {
      background: "default",
      display_mode: "full",
      theme: "dark",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Space not found");
  });
});
