import { z } from "zod";

/**
 * Schema for SMTP settings validation
 */
export const smtpSettingsSchema = z.object({
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

export type SmtpSettings = z.infer<typeof smtpSettingsSchema>;

/**
 * Default SMTP settings (used as placeholders for form)
 */
export const DEFAULT_SMTP_SETTINGS: Partial<SmtpSettings> = {
  mail_from: "",
  smtp_host: "",
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: "",
} as const;
