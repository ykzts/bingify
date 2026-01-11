import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createClient } from "@/lib/supabase/server";
import { updateSystemSettingsAction } from "../system-settings";

describe("Admin Settings Actions", () => {
  describe("updateSystemSettingsAction", () => {
    it("完全なネストされたフィーチャーフラグを含むFormDataを正しくパースして検証する", async () => {
      const userId = "admin-user-id";
      let capturedSettings: unknown;

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
                    data: { role: "admin" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              update: vi.fn().mockImplementation((data: unknown) => {
                capturedSettings = data;
                return {
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: capturedSettings,
                        error: null,
                      }),
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

      // FormDataを作成し、すべてのネストされたフィールドを含める
      const formData = new FormData();
      formData.set("archive_retention_days", "7");
      formData.set("spaces_archive_retention_days", "90");
      formData.set("default_user_role", "organizer");
      formData.set("max_participants_per_space", "50");
      formData.set("max_spaces_per_user", "5");
      formData.set("max_total_spaces", "1000");
      formData.set("space_expiration_days", "2");
      formData.set("space_expiration_hours", "0");

      // フィーチャーフラグ - すべてのネストされたフィールドを含める
      formData.set("features.gatekeeper.youtube.enabled", "on");
      formData.set("features.gatekeeper.youtube.member.enabled", "on");
      formData.set("features.gatekeeper.youtube.subscriber.enabled", "on");
      formData.set("features.gatekeeper.twitch.enabled", "on");
      formData.set("features.gatekeeper.twitch.follower.enabled", "on");
      formData.set("features.gatekeeper.twitch.subscriber.enabled", "on");
      formData.set("features.gatekeeper.email.enabled", "on");

      const result = await updateSystemSettingsAction(undefined, formData);

      // 検証が成功し、エラーがないことを確認
      expect(result.errors).toEqual([]);
      expect((result as any).meta?.success).toBe(true);

      // キャプチャされた設定が正しい構造を持つことを確認
      expect(capturedSettings).toMatchObject({
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: {
              enabled: true,
            },
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
        max_participants_per_space: 50,
        max_spaces_per_user: 5,
        max_total_spaces: 1000,
        space_expiration_hours: 48,
      });
    });

    it("チェックボックスが未選択の場合、falseとして正しくパースされる", async () => {
      const userId = "admin-user-id";
      let capturedSettings: unknown;

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
                    data: { role: "admin" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              update: vi.fn().mockImplementation((data: unknown) => {
                capturedSettings = data;
                return {
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: capturedSettings,
                        error: null,
                      }),
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

      // FormDataを作成 - チェックボックスはOFFの場合値が送信されない
      const formData = new FormData();
      formData.set("archive_retention_days", "7");
      formData.set("spaces_archive_retention_days", "90");
      formData.set("default_user_role", "user");
      formData.set("max_participants_per_space", "100");
      formData.set("max_spaces_per_user", "10");
      formData.set("max_total_spaces", "2000");
      formData.set("space_expiration_days", "1");
      formData.set("space_expiration_hours", "0");

      // すべてのチェックボックスがOFFの場合
      // FormDataには何も設定されない

      const result = await updateSystemSettingsAction(undefined, formData);

      // 検証が成功し、エラーがないことを確認
      expect(result.errors).toEqual([]);
      expect((result as any).meta?.success).toBe(true);

      // すべてのフラグがfalseであることを確認
      expect(capturedSettings).toMatchObject({
        default_user_role: "user",
        features: {
          gatekeeper: {
            email: {
              enabled: false,
            },
            twitch: {
              enabled: false,
              follower: { enabled: false },
              subscriber: { enabled: false },
            },
            youtube: {
              enabled: false,
              member: { enabled: false },
              subscriber: { enabled: false },
            },
          },
        },
      });
    });

    it("混在したチェックボックス状態を正しく処理する", async () => {
      const userId = "admin-user-id";
      let capturedSettings: unknown;

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
                    data: { role: "admin" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "system_settings") {
            return {
              update: vi.fn().mockImplementation((data: unknown) => {
                capturedSettings = data;
                return {
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: capturedSettings,
                        error: null,
                      }),
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

      // FormDataを作成 - 一部のチェックボックスのみON
      const formData = new FormData();
      formData.set("archive_retention_days", "14");
      formData.set("spaces_archive_retention_days", "90");
      formData.set("default_user_role", "organizer");
      formData.set("max_participants_per_space", "50");
      formData.set("max_spaces_per_user", "5");
      formData.set("max_total_spaces", "1000");
      formData.set("space_expiration_days", "2");
      formData.set("space_expiration_hours", "0");

      // YouTube: 有効、member: 有効、subscriber: 無効
      formData.set("features.gatekeeper.youtube.enabled", "on");
      formData.set("features.gatekeeper.youtube.member.enabled", "on");
      // youtube.subscriber.enabled は設定しない（OFF）

      // Twitch: 無効（すべてOFF）

      // Email: 有効
      formData.set("features.gatekeeper.email.enabled", "on");

      const result = await updateSystemSettingsAction(undefined, formData);

      // 検証が成功し、エラーがないことを確認
      expect(result.errors).toEqual([]);
      expect((result as any).meta?.success).toBe(true);

      // 混在した状態が正しく反映されていることを確認
      expect(capturedSettings).toMatchObject({
        features: {
          gatekeeper: {
            email: {
              enabled: true,
            },
            twitch: {
              enabled: false,
              follower: { enabled: false },
              subscriber: { enabled: false },
            },
            youtube: {
              enabled: true,
              member: { enabled: true },
              subscriber: { enabled: false },
            },
          },
        },
      });
    });

    it("ネストされたフィールドが欠落している場合検証エラーを返す", async () => {
      const userId = "admin-user-id";

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
                    data: { role: "admin" },
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

      // FormDataを作成 - 不完全なデータ
      const formData = new FormData();
      formData.set("max_participants_per_space", "50");
      // default_user_roleが欠落

      const result = await updateSystemSettingsAction(undefined, formData);

      // 検証エラーが発生することを確認
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("管理者でないユーザーは設定を更新できない", async () => {
      const userId = "regular-user-id";

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
                    data: { role: "user" }, // Not an admin
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
      formData.set("archive_retention_days", "7");
      formData.set("spaces_archive_retention_days", "90");
      formData.set("default_user_role", "organizer");
      formData.set("max_participants_per_space", "50");
      formData.set("max_spaces_per_user", "5");
      formData.set("max_total_spaces", "1000");
      formData.set("space_expiration_days", "2");
      formData.set("space_expiration_hours", "0");

      const result = await updateSystemSettingsAction(undefined, formData);

      // 権限エラーが返されることを確認
      expect(result.errors).toContain("errorNoPermission");
    });

    it("認証されていないユーザーは設定を更新できない", async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      };

      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const formData = new FormData();
      formData.set("default_user_role", "organizer");

      const result = await updateSystemSettingsAction(undefined, formData);

      // 検証エラー（必須フィールド欠落）が返されることを確認
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
