import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createClient } from "@/lib/supabase/server";
import { getUserSpaces } from "../actions";

describe("Dashboard Actions", () => {
  describe("getUserSpaces", () => {
    it("should return spaces with active space and participant count", async () => {
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
              }),
            };
          }
          if (table === "participants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: "p1" },
                    { id: "p2" },
                    { id: "p3" },
                    { id: "p4" },
                    { id: "p5" },
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

    it("should return error when user is not authenticated", async () => {
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

    it("should return error on database fetch failure", async () => {
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

    it("should handle no active spaces", async () => {
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
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockSpaces,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });

    it("should handle multiple active spaces and log warning", async () => {
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
          if (table === "participants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: 3,
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
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Multiple active spaces found")
      );
      expect(result.spaces).toHaveLength(2);

      consoleWarnSpy.mockRestore();
    });

    it("should handle empty spaces list", async () => {
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
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await getUserSpaces();
      expect(result.activeSpace).toBeNull();
      expect(result.spaces).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });
  });
});
