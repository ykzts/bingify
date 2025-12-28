import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claimAdmin, hasAdminUser } from "../../admin/actions";

describe("Setup Actions", () => {
  describe("hasAdminUser", () => {
    it("should return true when admin user exists", async () => {
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await hasAdminUser();
      expect(result).toBe(true);
    });

    it("should return false when no admin user exists", async () => {
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await hasAdminUser();
      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: null,
              error: new Error("Database error"),
            }),
          }),
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await hasAdminUser();
      expect(result).toBe(false);
    });
  });

  describe("claimAdmin", () => {
    it("should grant admin role when no admin exists and user is authenticated", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await claimAdmin();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error when user is not authenticated", async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await claimAdmin();
      expect(result.success).toBe(false);
      expect(result.error).toBe("errorUnauthorized");
    });

    it("should return error when admin already exists", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await claimAdmin();
      expect(result.success).toBe(false);
      expect(result.error).toBe("errorSetupCompleted");
    });

    it("should return error on database update failure", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 0,
                  error: null,
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: new Error("Update failed"),
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await claimAdmin();
      expect(result.success).toBe(false);
      expect(result.error).toBe("errorGeneric");
    });
  });
});
