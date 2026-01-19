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
      .max(23, "最大23時間までです"),
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
      .max(23, "最大23時間までです"),
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
      .max(23, "最大23時間までです"),
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

export const smtpSettingsFormSchema = z.object({
  mail_from: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .min(1, "送信元メールアドレスは必須です"),
  smtp_host: z
    .string()
    .min(1, "SMTPホストは必須です")
    .max(255, "SMTPホストは255文字以内で入力してください"),
  smtp_password: z.string().optional(),
  smtp_port: z
    .number()
    .int("整数を入力してください")
    .min(1, "ポート番号は1以上を指定してください")
    .max(65_535, "ポート番号は65535以下を指定してください"),
  smtp_secure: z.boolean(),
  smtp_user: z
    .string()
    .min(1, "SMTPユーザー名は必須です")
    .max(255, "SMTPユーザー名は255文字以内で入力してください"),
});

export type SmtpSettingsFormValues = z.infer<typeof smtpSettingsFormSchema>;

export const smtpSettingsFormOpts = formOptions({
  defaultValues: {
    mail_from: "",
    smtp_host: "",
    smtp_password: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
  } as SmtpSettingsFormValues,
});
