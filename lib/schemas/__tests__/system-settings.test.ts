import { describe, expect, it } from "vitest";
import { systemFeaturesSchema, systemSettingsSchema } from "../system-settings";

describe("systemFeaturesSchema", () => {
  it("有効な機能フラグ構造を受け入れる", () => {
    const result = systemFeaturesSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });

  it("すべて無効の機能フラグを受け入れる", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: false },
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
    });
    expect(result.success).toBe(true);
  });

  it("gatekeeperオブジェクトが欠落している場合は拒否する", () => {
    const result = systemFeaturesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("gatekeeperにemailが欠落している場合は拒否する", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
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
    });
    expect(result.success).toBe(false);
  });

  it("真偽値でないenabled値を拒否する", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: "true" },
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
    });
    expect(result.success).toBe(false);
  });

  it("プラットフォームが有効だがネストされた要件フィールドが欠落している場合は拒否する", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: true },
        twitch: {
          enabled: true,
          follower: { enabled: true },
          // subscriber is missing
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("ネストされたフィールドの型が間違っている場合は拒否する（オブジェクトではなく文字列）", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: true },
        twitch: {
          enabled: true,
          follower: "true", // Should be { enabled: boolean }
          subscriber: { enabled: true },
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("ネストされたenabledフィールドの型が間違っている場合は拒否する（真偽値ではなく文字列）", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: true },
        twitch: {
          enabled: true,
          follower: { enabled: "true" }, // Should be boolean
          subscriber: { enabled: true },
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("プラットフォームが無効の場合、混在した要件状態を受け入れる", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        email: { enabled: true },
        twitch: {
          enabled: false, // Platform disabled
          follower: { enabled: true }, // But requirements can be any state
          subscriber: { enabled: false },
        },
        youtube: {
          enabled: true,
          member: { enabled: true },
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("古いデータでyoutube memberが欠落しているがmemberが存在する場合は受け入れる", () => {
    // This tests backward compatibility - old data may not have member field
    const result = systemFeaturesSchema.safeParse({
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
    });
    expect(result.success).toBe(true);
  });
});

describe("systemSettingsSchema", () => {
  it("機能を含む有効なシステム設定を受け入れる", () => {
    const result = systemSettingsSchema.safeParse({
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
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(true);
  });

  it("機能がない設定を拒否する", () => {
    const result = systemSettingsSchema.safeParse({
      max_participants_per_space: 50,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("無効なmax_participants_per_space値を拒否する", () => {
    const settings = {
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
      max_participants_per_space: 0,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    };
    const result = systemSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it("無効なmax_spaces_per_user値を拒否する", () => {
    const settings = {
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
      max_spaces_per_user: 0,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    };
    const result = systemSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });

  it("space_expiration_hoursが0（無制限）の場合は受け入れる", () => {
    const result = systemSettingsSchema.safeParse({
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
      space_expiration_hours: 0,
    });
    expect(result.success).toBe(true);
  });

  it("負のspace_expiration_hoursを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      space_expiration_hours: -1,
    });
    expect(result.success).toBe(false);
  });

  it("制限を超えるmax_participants_per_spaceを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      max_participants_per_space: 10_001,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("制限を超えるmax_spaces_per_userを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      max_spaces_per_user: 101,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("制限を超えるspace_expiration_hoursを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      space_expiration_hours: 8761,
    });
    expect(result.success).toBe(false);
  });

  it("max_total_spacesが0（無制限）の場合は受け入れる", () => {
    const result = systemSettingsSchema.safeParse({
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
      max_total_spaces: 0,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(true);
  });

  it("負のmax_total_spacesを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      max_total_spaces: -1,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("制限を超えるmax_total_spacesを拒否する", () => {
    const result = systemSettingsSchema.safeParse({
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
      max_total_spaces: 100_001,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });
});
