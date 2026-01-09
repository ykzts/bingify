import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarSource } from "../avatar-service";
import { getAvailableAvatars, setActiveAvatar } from "../avatar-service";

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("avatar-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setActiveAvatar", () => {
    it("プロバイダーアバターを有効にする", async () => {
      const userId = "user-123";
      const source: AvatarSource = "google";
      const mockAvatarUrl = "https://example.com/google-avatar.jpg";

      // Mock getUser to return user with identities
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            identities: [
              {
                identity_data: {
                  avatar_url: mockAvatarUrl,
                },
                provider: "google",
              },
            ],
          },
        },
        error: null,
      });

      // Mock profile update
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await setActiveAvatar(userId, source);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("デフォルトアバターを有効にする", async () => {
      const userId = "user-123";
      const source: AvatarSource = "default";

      // Mock profile update
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await setActiveAvatar(userId, source);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("プロバイダーが見つからない場合にエラーを返す", async () => {
      const userId = "user-123";
      const source: AvatarSource = "twitch";

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            identities: [],
          },
        },
        error: null,
      });

      const result = await setActiveAvatar(userId, source);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Provider identity not found");
    });
  });

  describe("getAvailableAvatars", () => {
    it("利用可能なアバター一覧を取得する", async () => {
      const userId = "user-123";

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            identities: [
              {
                identity_data: {
                  avatar_url: "https://example.com/google.jpg",
                },
                provider: "google",
              },
              {
                identity_data: {
                  picture: "https://example.com/twitch.jpg",
                },
                provider: "twitch",
              },
            ],
          },
        },
        error: null,
      });

      const result = await getAvailableAvatars(userId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].provider).toBe("google");
      expect(result.data?.[1].provider).toBe("twitch");
    });

    it("認証エラーの場合にエラーを返す", async () => {
      const userId = "user-123";

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Unauthorized" },
      });

      const result = await getAvailableAvatars(userId);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Unauthorized");
    });

    it("空の配列を返す場合", async () => {
      const userId = "user-123";

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: userId,
            identities: [],
          },
        },
        error: null,
      });

      const result = await getAvailableAvatars(userId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });
});
