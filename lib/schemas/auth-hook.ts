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
// 参考: https://github.com/supabase/auth/blob/v2.185.0/internal/mailer/mailer.go#L22-L33
// すべてのフィールドは常に存在し、不使用時は空文字列で送信される
const EmailDataSchema = z
  .object({
    email_action_type: z.string(),
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
  // レガシー形式（テスト互換用）
  email: z
    .object({
      change_email_new_token_new: z.string().optional(),
      change_email_new_token_new_hash: z.string().optional(),
      change_email_old_new: z.string().optional(),
      change_email_old_token: z.string().optional(),
      change_email_old_token_hash: z.string().optional(),
      confirmation_hash: z.string().optional(),
      confirmation_token: z.string().optional(),
      email_action_type: z.string().optional(),
      invite_token: z.string().optional(),
      invite_token_hash: z.string().optional(),
      recovery_token: z.string().optional(),
      recovery_token_hash: z.string().optional(),
    })
    .loose()
    .optional(),
  email_data: EmailDataSchema,
  user: UserSchema.optional(),
});

export type AuthHookPayload = z.infer<typeof AuthHookPayloadSchema>;
export type EmailData = z.infer<typeof EmailDataSchema>;
export type User = z.infer<typeof UserSchema>;

// 互換用: 正規化済みメール構造（テストが利用）
export type NormalizedEmail = {
  change_email_new_token_new?: string;
  change_email_new_token_new_hash?: string;
  change_email_old_new?: string;
  change_email_old_token?: string;
  change_email_old_token_hash?: string;
  confirmation_hash?: string;
  confirmation_token?: string;
  email_action_type: string;
  invite_token?: string;
  invite_token_hash?: string;
  recovery_token?: string;
  recovery_token_hash?: string;
};

// 互換用: 新形式（email_data）からレガシー形式（email）へ簡易正規化
export function normalizeAuthHookPayload(
  payload: unknown
): { email: NormalizedEmail; siteUrlOverride?: string; user?: User } | null {
  const result = AuthHookPayloadSchema.safeParse(
    // email_data を持つプレーン構造にも対応させる
    typeof payload === "object" && payload !== null && (payload as any).data
      ? { email_data: (payload as any).data, user: (payload as any).user }
      : payload
  );

  if (!result.success) return null;
  const { email_data, user } = result.data;

  const siteUrlOverride = (() => {
    const url = email_data?.site_url;
    if (!url) return undefined;
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  const type = email_data?.email_action_type;
  const normalized: NormalizedEmail = {
    email_action_type: type || "",
  };

  switch (type) {
    case "signup": {
      normalized.confirmation_token = email_data.token || undefined;
      normalized.confirmation_hash = email_data.token_hash || undefined;
      break;
    }
    case "recovery":
    case "magiclink": {
      normalized.recovery_token = email_data.token || undefined;
      normalized.recovery_token_hash = email_data.token_hash || undefined;
      break;
    }
    case "invite": {
      normalized.invite_token = email_data.token || undefined;
      normalized.invite_token_hash = email_data.token_hash || undefined;
      break;
    }
    case "email_change": {
      normalized.change_email_old_new = email_data.old_email || undefined;
      // 旧メール向け（token + token_hash_new）
      normalized.change_email_old_token = email_data.token || undefined;
      normalized.change_email_old_token_hash =
        email_data.token_hash_new || undefined;
      // 新メール向け（token_new + token_hash）
      normalized.change_email_new_token_new =
        email_data.token_new || undefined;
      normalized.change_email_new_token_new_hash =
        email_data.token_hash || undefined;
      break;
    }
    default:
      break;
  }

  return { email: normalized, siteUrlOverride, user };
}
