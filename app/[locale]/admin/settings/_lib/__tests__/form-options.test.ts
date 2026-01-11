import { describe, expect, it } from "vitest";
import { systemSettingsFormSchema } from "../form-options";

describe("systemSettingsFormSchema", () => {
  describe("space_expiration フィールド", () => {
    it("有効な日数+時間の組み合わせを受け入れる", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 2,
          hours: 12,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(true);
    });

    it("日数のみの指定を受け入れる", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 7,
          hours: 0,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(true);
    });

    it("時間のみの指定を受け入れる", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 0,
          hours: 12,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(true);
    });

    it("日数と時間が両方0の場合は拒否する", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 0,
          hours: 0,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "無期限にする場合を除き"
        );
      }
    });

    it("負の日数を拒否する", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: -1,
          hours: 12,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });

    it("負の時間を拒否する", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 2,
          hours: -1,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });

    it("365日を超える日数を拒否する", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 366,
          hours: 0,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });

    it("23時間を超える時間を拒否する", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 2,
          hours: 24,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });

    it("最大値 (365日23時間) を受け入れる", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 365,
          hours: 23,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(true);
    });

    it("小数を拒否する (日数)", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 2.5,
          hours: 0,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });

    it("小数を拒否する (時間)", () => {
      const result = systemSettingsFormSchema.safeParse({
        archive_retention_days: 7,
        default_user_role: "organizer",
        features: {
          gatekeeper: {
            email: { enabled: true },
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
        space_expiration: {
          days: 2,
          hours: 12.5,
        },
        spaces_archive_retention_days: 90,
      });
      expect(result.success).toBe(false);
    });
  });
});
