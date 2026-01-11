import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";

export const systemSettingsFormSchema = z.object({
  archive_retention: z.object({
    days: z
      .number()
      .int("整数を入力してください")
      .min(0, "0日以上を指定してください")
      .max(9999, "最大9999日までです"),
    hours: z
      .number()
      .int("整数を入力してください")
      .min(0, "0時間以上を指定してください")
      .max(9999, "最大9999時間までです"),
  }),
  default_user_role: z.enum(["organizer", "user"]),
  features: z.object({
    gatekeeper: z.object({
      email: z.object({
        enabled: z.boolean(),
      }),
      twitch: z.object({
        enabled: z.boolean(),
        follower: z.object({
          enabled: z.boolean(),
        }),
        subscriber: z.object({
          enabled: z.boolean(),
        }),
      }),
      youtube: z.object({
        enabled: z.boolean(),
        member: z.object({
          enabled: z.boolean(),
        }),
        subscriber: z.object({
          enabled: z.boolean(),
        }),
      }),
    }),
  }),
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
  space_expiration: z.object({
    days: z
      .number()
      .int("整数を入力してください")
      .min(0, "0日以上を指定してください")
      .max(9999, "最大9999日までです"),
    hours: z
      .number()
      .int("整数を入力してください")
      .min(0, "0時間以上を指定してください")
      .max(9999, "最大9999時間までです"),
  }),
  spaces_archive_retention: z.object({
    days: z
      .number()
      .int("整数を入力してください")
      .min(0, "0日以上を指定してください")
      .max(9999, "最大9999日までです"),
    hours: z
      .number()
      .int("整数を入力してください")
      .min(0, "0時間以上を指定してください")
      .max(9999, "最大9999時間までです"),
  }),
});

export type SystemSettingsFormValues = z.infer<typeof systemSettingsFormSchema>;

export const systemSettingsFormOpts = formOptions({
  defaultValues: {
    archive_retention: {
      days: 7,
      hours: 0,
    },
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
      hours: 0,
    },
    spaces_archive_retention: {
      days: 90,
      hours: 0,
    },
  } as SystemSettingsFormValues,
});
