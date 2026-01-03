import { z } from "zod";
import type { SystemFeatures } from "@/lib/types/settings";

// Schema for validating feature flags structure
export const systemFeaturesSchema = z.object({
  gatekeeper: z.object({
    email: z.object({
      enabled: z.boolean(),
    }),
    twitch: z.object({
      enabled: z.boolean(),
    }),
    youtube: z.object({
      enabled: z.boolean(),
    }),
  }),
}) satisfies z.ZodType<SystemFeatures>;

// Schema for default user role
export const defaultUserRoleSchema = z.enum(["organizer", "user"]);

export const systemSettingsSchema = z.object({
  default_user_role: defaultUserRoleSchema,
  features: systemFeaturesSchema,
  max_participants_per_space: z
    .number()
    .int("整数を入力してください")
    .min(1, "1人以上を指定してください")
    .max(10_000, "最大10000人までです"),
  max_spaces_per_user: z
    .number()
    .int("整数を入力してください")
    .min(1, "1スペース以上を指定してください")
    .max(100, "最大100スペースまでです"),
  max_total_spaces: z
    .number()
    .int("整数を入力してください")
    .min(0, "0以上を指定してください（0は無制限）")
    .max(100_000, "最大100000スペースまでです"),
  space_expiration_hours: z
    .number()
    .int("整数を入力してください")
    .min(0, "0時間以上を指定してください（0は無期限）")
    .max(8760, "最大8760時間（365日）までです"),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

/**
 * Default system settings used as fallback when database values are invalid
 */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  default_user_role: "organizer",
  features: {
    gatekeeper: {
      email: { enabled: true },
      twitch: { enabled: true },
      youtube: { enabled: true },
    },
  },
  max_participants_per_space: 50,
  max_spaces_per_user: 5,
  max_total_spaces: 1000,
  space_expiration_hours: 48,
} as const satisfies SystemSettings;
