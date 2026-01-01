import { describe, expect, it, vi, beforeEach } from "vitest";
import { publishSpace } from "../actions";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/utils/uuid", () => ({
  isValidUUID: vi.fn(),
}));

describe("publishSpace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully publish space by owner", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      owner_id: "owner-123",
    };

    // Create mock functions for the chain
    const mockSingleForSpace = vi.fn().mockResolvedValue({
      data: mockSpace,
      error: null,
    });

    const mockSingleForAdmin = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockEqChainForUpdate = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: mockEqChainForUpdate,
      })),
    }));

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-123" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          // First call - space query
          if (!mockSingleForSpace.mock.calls.length) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForSpace,
                })),
              })),
              update: mockUpdate,
            };
          }
          // Second call - update
          return {
            update: mockUpdate,
          };
        }
        // space_roles query
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForAdmin,
                })),
              })),
            })),
          })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "active" });
  });

  it("should successfully publish space by admin", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      owner_id: "owner-123",
    };

    const mockAdminRole = {
      id: "admin-role-id",
    };

    const mockSingleForSpace = vi.fn().mockResolvedValue({
      data: mockSpace,
      error: null,
    });

    const mockSingleForAdmin = vi.fn().mockResolvedValue({
      data: mockAdminRole,
      error: null,
    });

    const mockEqChainForUpdate = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: mockEqChainForUpdate,
      })),
    }));

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-456" } }, // Different user
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          if (!mockSingleForSpace.mock.calls.length) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForSpace,
                })),
              })),
              update: mockUpdate,
            };
          }
          return {
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForAdmin,
                })),
              })),
            })),
          })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({ success: true });
  });

  it("should reject unauthorized user", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      owner_id: "owner-123",
    };

    const mockSingleForSpace = vi.fn().mockResolvedValue({
      data: mockSpace,
      error: null,
    });

    const mockSingleForAdmin = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "unauthorized-user" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSingleForSpace,
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForAdmin,
                })),
              })),
            })),
          })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "権限がありません",
      success: false,
    });
  });

  it("should handle space not found", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSingleForSpace = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-123" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingleForSpace,
          })),
        })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "スペースが見つかりませんでした",
      success: false,
    });
  });

  it("should handle update failure", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSpace = {
      owner_id: "owner-123",
    };

    const mockSingleForSpace = vi.fn().mockResolvedValue({
      data: mockSpace,
      error: null,
    });

    const mockSingleForAdmin = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockEqChainForUpdate = vi.fn().mockResolvedValue({
      error: { message: "Database error" },
    });

    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: mockEqChainForUpdate,
      })),
    }));

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-123" } },
        }),
      },
      from: vi.fn((tableName: string) => {
        if (tableName === "spaces") {
          if (!mockSingleForSpace.mock.calls.length) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForSpace,
                })),
              })),
              update: mockUpdate,
            };
          }
          return {
            update: mockUpdate,
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: mockSingleForAdmin,
                })),
              })),
            })),
          })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "公開に失敗しました",
      success: false,
    });
  });

  it("should handle invalid UUID", async () => {
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(false);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "invalid-id",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "Invalid space ID",
      success: false,
    });
  });

  it("should handle missing user authentication", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { isValidUUID } = await import("@/lib/utils/uuid");

    vi.mocked(isValidUUID).mockReturnValue(true);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const emptyFormData = new FormData();

    const result = await publishSpace(
      "space-123",
      { success: false },
      emptyFormData
    );

    expect(result).toEqual({
      error: "認証が必要です。ログインしてください。",
      success: false,
    });
  });
});
