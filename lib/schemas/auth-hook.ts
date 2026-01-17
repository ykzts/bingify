import { z } from "zod";

/**
 * Supabase Auth Hook v0 webhook ペイロード
 * 参考: https://github.com/supabase/auth/blob/v2.185.0/internal/hooks/v0hooks/v0hooks.go#L188-L191
 *
 * Supabase Authから送信されるメールホック：
 * {
 *   "user": { ... },
 *   "email_data": {
 *     "token": string,
 *     "token_hash": string,
 *     "redirect_to": string,
 *     "email_action_type": "signup" | "magiclink" | "recovery" | "email_change" | "invite",
 *     "site_url": string,
 *     "token_new": string,
 *     "token_hash_new": string,
 *     "old_email": string,
 *     "old_phone": string,
 *     "provider": string,
 *     "factor_type": string
 *   }
 * }
 */

// Supabase User モデル
// 参考: https://github.com/supabase/auth/blob/v2.185.0/internal/models/user.go
const UserSchema = z
  .object({
    app_metadata: z.record(z.string(), z.unknown()),
    aud: z.string(),
    created_at: z.string(),
    email: z.string(),
    id: z.string(),
    identities: z.array(z.record(z.string(), z.unknown())),
    is_anonymous: z.boolean(),
    phone: z.string(),
    role: z.string(),
    updated_at: z.string(),
    user_metadata: z.record(z.string(), z.unknown()),
  })
  .loose();

// Supabase EmailData
// 参考: https://github.com/supabase/auth/blob/v2.185.0/internal/mailer/mailer.go
// すべてのフィールドは常に存在し、不使用時は空文字列で送信される
const EMAIL_ACTION_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
  "reauthentication",
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
] as const;

const EmailDataSchema = z
  .object({
    email_action_type: z.enum(EMAIL_ACTION_TYPES),
    factor_type: z.string(),
    old_email: z.string(),
    old_phone: z.string(),
    provider: z.string(),
    redirect_to: z.string(),
    site_url: z.string(),
    token: z.string(),
    token_hash: z.string(),
    token_hash_new: z.string(),
    token_new: z.string(),
  })
  .loose();

// Auth Hook Webhook ペイロード
export const AuthHookPayloadSchema = z.object({
  email_data: EmailDataSchema.optional(),
  user: UserSchema.optional(),
});

export type AuthHookPayload = z.infer<typeof AuthHookPayloadSchema>;
export type EmailData = z.infer<typeof EmailDataSchema>;
export type User = z.infer<typeof UserSchema>;
