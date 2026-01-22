import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => (key: string) => key),
}));

// Import after mocks
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "../account";

describe("Account Deletion", () => {
  describe("deleteAccount", () => {
    it("should successfully delete a regular user account", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "user" },
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockAdminClient = {
        auth: {
          admin: {
            deleteUser: vi.fn().mockResolvedValue({ error: null }),
          },
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await deleteAccount();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        userId
      );
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });

    it("should prevent admin users from deleting their account", async () => {
      const userId = "admin-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "admin" },
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe("errorAdminCannotDelete");
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

      const result = await deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe("errorUnauthorized");
    });

    it("should handle deletion errors", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "user" },
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockAdminClient = {
        auth: {
          admin: {
            deleteUser: vi
              .fn()
              .mockResolvedValue({ error: { message: "Delete failed" } }),
          },
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe("errorDeleteFailed");
    });

    it("should handle organizer users", async () => {
      const userId = "organizer-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "organizer" },
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockAdminClient = {
        auth: {
          admin: {
            deleteUser: vi.fn().mockResolvedValue({ error: null }),
          },
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const result = await deleteAccount();

      expect(result.success).toBe(true);
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        userId
      );
    });

    it("should handle profile query errors", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Profile not found" },
              }),
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await deleteAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBe("errorGeneric");
    });
  });
});
