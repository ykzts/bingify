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
import { claimAdmin, hasAdminUser } from "../../admin/_lib/actions";

describe("Setup Actions", () => {
  describe("hasAdminUser", () => {
    it("管理者ユーザーが存在する場合trueを返す", async () => {
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

    it("管理者ユーザーが存在しない場合falseを返す", async () => {
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

    it("データベースエラー時にエラーをスローする", async () => {
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

      await expect(hasAdminUser()).rejects.toThrow(
        "Failed to determine admin existence"
      );
    });
  });

  describe("claimAdmin", () => {
    it("管理者が存在せずユーザーが認証済みの場合管理者ロールを付与する", async () => {
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
                  count: 1,
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

    it("ユーザーが認証されていない場合エラーを返す", async () => {
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

    it("管理者が既に存在する場合エラーを返す", async () => {
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

    it("データベース更新失敗時にエラーを返す", async () => {
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

    it("プロフィールが存在しない場合エラーを返す", async () => {
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
                  count: 0,
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
      expect(result.success).toBe(false);
      expect(result.error).toBe("errorGeneric");
    });
  });
});
