import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    default: actual,
    randomUUID: vi.fn(() => "test-uuid-123"),
  };
});

vi.mock("date-fns", () => ({
  format: vi.fn(() => "20241231"),
}));

vi.mock("@/lib/crypto", () => ({
  generateSecureToken: vi.fn(() => "test-token-123"),
}));

// Import after mocks
import { createClient } from "@/lib/supabase/server";
import { createSpace, getUserSpaces } from "../_actions/space-management";

describe("Dashboard Actions", () => {
  describe("getUserSpaces", () => {
    it("アクティブなスペースと参加者数を含むスペースを返す", async () => {
      const userId = "test-user-id";
      const mockSpaces = [
        {
          id: "space-1",
          share_key: "active-space-20241228",
          status: "active",
          created_at: "2024-12-28T00:00:00Z",
        },
        {
          id: "space-2",
          share_key: "closed-space-20241227",
          status: "closed",
          created_at: "2024-12-27T00:00:00Z",
        },
      ];

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "spaces") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockSpaces,
                    error: null,
                  }),
                }),
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            };
          }
          if (table === "space_roles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "participants") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                  ],
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeDefined();
      expect(result.activeSpace?.id).toBe("space-1");
      expect(result.activeSpace?.participant_count).toBe(5);
      expect(result.spaces).toHaveLength(2);
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

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(0);
      expect(result.error).toBe("Authentication required");
    });

    it("データベース取得失敗時にエラーを返す", async () => {
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
              order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Database error"),
              }),
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(0);
      expect(result.error).toBe("Failed to fetch spaces");
    });

    it("アクティブなスペースがない場合を処理する", async () => {
      const userId = "test-user-id";
      const mockSpaces = [
        {
          id: "space-1",
          share_key: "closed-space-20241228",
          status: "closed",
          created_at: "2024-12-28T00:00:00Z",
        },
        {
          id: "space-2",
          share_key: "closed-space-20241227",
          status: "closed",
          created_at: "2024-12-27T00:00:00Z",
        },
      ];

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "spaces") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockSpaces,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "space_roles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "participants") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });

    it("複数のアクティブなスペースを処理し警告をログ出力する", async () => {
      const userId = "test-user-id";
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {
          // Intentionally empty to suppress console output in tests
        });
      const mockSpaces = [
        {
          id: "space-1",
          share_key: "active-space-1-20241228",
          status: "active",
          created_at: "2024-12-28T00:00:00Z",
        },
        {
          id: "space-2",
          share_key: "active-space-2-20241227",
          status: "active",
          created_at: "2024-12-27T00:00:00Z",
        },
      ];

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "spaces") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockSpaces,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "space_roles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "participants") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                    { space_id: "space-1" },
                  ],
                  error: null,
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeDefined();
      expect(result.activeSpace?.id).toBe("space-1");
      expect(result.activeSpace?.participant_count).toBe(3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Multiple active spaces found")
      );
      expect(result.spaces).toHaveLength(2);

      consoleWarnSpy.mockRestore();
    });

    it("空のスペースリストを処理する", async () => {
      const userId = "test-user-id";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "spaces") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "space_roles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });
  });

  describe("createSpace", () => {
    it("アクティブなスペースの最大数に達した場合スペース作成を拒否する", async () => {
      const userId = "test-user-id";
      const shareKey = "test-space";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: "organizer" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { max_spaces_per_user: 5 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "spaces") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    count: 5, // User has 5 active spaces (at the limit)
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("share_key", shareKey);

      const result = await createSpace({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("maxSpacesReached");
      expect(result.errorData?.max).toBe(5);
    });

    it("ユーザー認証を必要とする", async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("share_key", "test-space");

      const result = await createSpace({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("認証が必要です。ログインしてください。");
    });

    it("共有キーのフォーマットを検証する", async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "test-user-id" } },
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("share_key", "AB"); // Too short

      const result = await createSpace({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("3文字以上");
    });

    it("最大制限をチェックする際にアクティブなスペースのみカウントする（クローズ済みは除外）", async () => {
      const userId = "test-user-id";
      const shareKey = "test-space";

      let selectCalled = false;
      let neqCalledWithClosed = false;

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: "organizer" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { max_spaces_per_user: 5 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "spaces") {
            return {
              select: vi.fn().mockImplementation(() => {
                selectCalled = true;
                return {
                  eq: vi.fn().mockReturnValue({
                    neq: vi
                      .fn()
                      .mockImplementation((column: string, value: string) => {
                        if (column === "status" && value === "closed") {
                          neqCalledWithClosed = true;
                        }
                        return Promise.resolve({
                          count: 4, // User has 4 active spaces
                          error: null,
                        });
                      }),
                  }),
                };
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("share_key", shareKey);

      await createSpace({ success: false }, formData);

      // Verify that the query was made to exclude closed spaces
      expect(selectCalled).toBe(true);
      expect(neqCalledWithClosed).toBe(true);
    });

    it("グローバルの合計スペース最大数に達した場合スペース作成を拒否する", async () => {
      const userId = "test-user-id";
      const shareKey = "test-space";

      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { role: "organizer" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { max_spaces_per_user: 5, max_total_spaces: 10 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "spaces") {
            // First call is for global count (head: true)
            // Second call is for user count
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  neq: vi.fn().mockResolvedValue({
                    count: 10, // Global limit reached
                    error: null,
                  }),
                }),
                neq: vi.fn().mockResolvedValue({
                  count: 10, // Global limit reached
                  error: null,
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("share_key", shareKey);

      const result = await createSpace({ success: false }, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("maxTotalSpacesReached");
    });
  });
});
