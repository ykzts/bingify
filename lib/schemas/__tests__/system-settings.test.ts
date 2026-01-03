import { describe, expect, it } from "vitest";
import { systemFeaturesSchema, systemSettingsSchema } from "../system-settings";

describe("systemFeaturesSchema", () => {
  it("should accept valid feature flags structure", () => {
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
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept feature flags with all disabled", () => {
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
          subscriber: { enabled: false },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing gatekeeper object", () => {
    const result = systemFeaturesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject missing email in gatekeeper", () => {
    const result = systemFeaturesSchema.safeParse({
      gatekeeper: {
        twitch: {
          enabled: true,
          follower: { enabled: true },
          subscriber: { enabled: true },
        },
        youtube: {
          enabled: true,
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-boolean enabled value", () => {
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
          subscriber: { enabled: true },
        },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("systemSettingsSchema", () => {
  it("should accept valid system settings with features", () => {
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

  it("should reject settings without features", () => {
    const result = systemSettingsSchema.safeParse({
      max_participants_per_space: 50,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid max_participants_per_space values", () => {
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

  it("should reject invalid max_spaces_per_user values", () => {
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

  it("should accept space_expiration_hours as 0 (unlimited)", () => {
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

  it("should reject negative space_expiration_hours", () => {
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

  it("should reject max_participants_per_space over limit", () => {
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

  it("should reject max_spaces_per_user over limit", () => {
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

  it("should reject space_expiration_hours over limit", () => {
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

  it("should accept max_total_spaces as 0 (unlimited)", () => {
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

  it("should reject negative max_total_spaces", () => {
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

  it("should reject max_total_spaces over limit", () => {
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
