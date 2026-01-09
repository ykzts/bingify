import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarSource } from "../avatar-service";
import {
  getAvailableAvatars,
  setActiveAvatar,
  updateProviderAvatar,
} from "../avatar-service";

// Mock Supabase admin client
const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

describe("avatar-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProviderAvatar", () => {
    it("プロバイダーアバターを正常に更新する", async () => {
      const userId = "user-123";
      const provider: AvatarSource = "google";
      const avatarUrl = "https://example.com/avatar.jpg";

      mockAdminClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await updateProviderAvatar(userId, provider, avatarUrl);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockAdminClient.from).toHaveBeenCalledWith(
        "user_provider_avatars"
      );
    });

    it("エラーが発生した場合にエラーを返す", async () => {
      const userId = "user-123";
      const provider: AvatarSource = "google";
      const avatarUrl = "https://example.com/avatar.jpg";

      mockAdminClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      });

      const result = await updateProviderAvatar(userId, provider, avatarUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("setActiveAvatar", () => {
    it("プロバイダーアバターを有効にする", async () => {
      const userId = "user-123";
      const source: AvatarSource = "google";
      const mockAvatarUrl = "https://example.com/google-avatar.jpg";

      // Mock provider avatar fetch
      mockAdminClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: mockAvatarUrl },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock profile update
      mockAdminClient.from.mockReturnValueOnce({
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
      mockAdminClient.from.mockReturnValue({
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

    it("プロバイダーアバターが見つからない場合にエラーを返す", async () => {
      const userId = "user-123";
      const source: AvatarSource = "twitch";

      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      });

      const result = await setActiveAvatar(userId, source);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Provider avatar not found");
    });
  });

  describe("getAvailableAvatars", () => {
    it("利用可能なアバター一覧を取得する", async () => {
      const userId = "user-123";
      const mockData = [
        { provider: "google", avatar_url: "https://example.com/google.jpg" },
        { provider: "twitch", avatar_url: "https://example.com/twitch.jpg" },
      ];

      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      });

      const result = await getAvailableAvatars(userId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].provider).toBe("google");
      expect(result.data?.[1].provider).toBe("twitch");
    });

    it("エラーが発生した場合にエラーを返す", async () => {
      const userId = "user-123";

      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const result = await getAvailableAvatars(userId);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Database error");
    });

    it("空の配列を返す場合", async () => {
      const userId = "user-123";

      mockAdminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getAvailableAvatars(userId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });
});
