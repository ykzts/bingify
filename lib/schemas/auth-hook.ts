import { z } from "zod";
import authHookJsonSchema from "./auth-hook-json-schema.json" with {
  type: "json",
};

/**
 * Supabase Auth Hookのメールデータスキーマ
 * 新しい形式（email_dataフィールド）とレガシー形式（emailフィールド）の両方に対応
 *
 * 新しい形式のスキーマはSupabase公式ドキュメントのJSON Schemaから z.fromJSONSchema() で自動生成
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 * @see ./auth-hook-json-schema.json - 公式JSON Schemaの参照コピー（required フィールドを削除済み）
 */

// Supabase公式JSON SchemaからZodスキーマを生成
// 注意: x-fakerなどの拡張プロパティはZodでは無視される
// JSON Schema の required フィールドは削除済みなので、すべてのフィールドがoptional
const GeneratedSchema = z.fromJSONSchema(
  authHookJsonSchema as unknown as Parameters<typeof z.fromJSONSchema>[0]
) as z.ZodObject<{
  email_data: z.ZodOptional<z.ZodType>;
  user: z.ZodOptional<z.ZodType>;
}>;

// 生成されたスキーマから email_data を抽出
const EmailDataSchema = GeneratedSchema.shape.email_data;

// 生成されたスキーマの型定義
interface GeneratedEmailData {
  email_action_type?: string;
  factor_type?: string;
  old_email?: string;
  old_phone?: string;
  provider?: string;
  redirect_to?: string;
  site_url?: string;
  token?: string;
  token_hash?: string;
  token_hash_new?: string;
  token_new?: string;
  [key: string]: unknown;
}

interface GeneratedUser {
  app_metadata?: {
    language?: string;
    provider?: string;
    providers?: string[];
    [key: string]: unknown;
  };
  aud?: string;
  created_at?: string;
  email?: string;
  id?: string;
  identities?: Array<{
    [key: string]: unknown;
  }>;
  is_anonymous?: boolean;
  phone?: string;
  role?: string;
  updated_at?: string;
  user_metadata?: {
    language?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 生成されたスキーマから user を抽出
// アプリ固有の language フィールドはpassthroughで許容されるため、
// 生成されたスキーマをそのまま使用
const UserSchema = GeneratedSchema.shape.user;

// レガシーペイロード構造（emailフィールド）
const LegacyEmailSchema = z.object({
  change_email_new_token_new: z.string().optional(),
  change_email_new_token_new_hash: z.string().optional(),
  change_email_old_new: z.string().optional(),
  change_email_old_token: z.string().optional(),
  change_email_old_token_hash: z.string().optional(),
  confirmation_hash: z.string().optional(),
  confirmation_token: z.string().optional(),
  email_action_type: z.string(),
  invite_token: z.string().optional(),
  invite_token_hash: z.string().optional(),
  recovery_token: z.string().optional(),
  recovery_token_hash: z.string().optional(),
});

// Auth Hookペイロード（両形式を受け入れる）
export const AuthHookPayloadSchema = z.object({
  email: LegacyEmailSchema.optional(),
  email_data: EmailDataSchema,
  user: UserSchema.optional(),
});

export type AuthHookPayload = z.infer<typeof AuthHookPayloadSchema>;

/**
 * 正規化されたメールペイロード（内部形式）
 */
export const NormalizedEmailSchema = z.object({
  change_email_new_token_new: z.string().optional(),
  change_email_new_token_new_hash: z.string().optional(),
  change_email_old_new: z.string().optional(),
  change_email_old_token: z.string().optional(),
  change_email_old_token_hash: z.string().optional(),
  confirmation_hash: z.string().optional(),
  confirmation_token: z.string().optional(),
  email_action_type: z.string(),
  invite_token: z.string().optional(),
  invite_token_hash: z.string().optional(),
  recovery_token: z.string().optional(),
  recovery_token_hash: z.string().optional(),
});

export type NormalizedEmail = z.infer<typeof NormalizedEmailSchema>;

/**
 * 正規化されたペイロード（出力形式）
 */
export const NormalizedPayloadSchema = z.object({
  email: NormalizedEmailSchema,
  siteUrlOverride: z.string().url().optional(),
  user: z.custom<GeneratedUser>().optional(),
});

export type NormalizedPayload = z.infer<typeof NormalizedPayloadSchema>;

/**
 * Supabase Auth Hookペイロードを正規化
 * レガシー形式と新しい形式の両方を一貫性のある内部構造にマッピング
 */
export function normalizeAuthHookPayload(
  payload: unknown
): NormalizedPayload | null {
  // ペイロードを解析および検証
  const result = AuthHookPayloadSchema.safeParse(payload);

  if (!result.success) {
    return null;
  }

  const { email, email_data, user } = result.data;

  // 新しい形式（email_dataが存在）の場合、それを使用
  if (email_data) {
    return normalizeNewPayload(
      email_data as GeneratedEmailData,
      user as GeneratedUser
    );
  }

  // レガシー形式（emailフィールドが存在）
  if (email) {
    return NormalizedPayloadSchema.parse({
      email,
      siteUrlOverride: undefined,
      user,
    });
  }

  // 有効なメールデータが見つかりません
  return null;
}

/**
 * 新しいペイロード形式（email_data）を正規化
 */
function normalizeNewPayload(
  emailData: GeneratedEmailData,
  user: GeneratedUser | undefined
): NormalizedPayload | null {
  const siteUrlOverride = normalizeSiteUrl(
    emailData.redirect_to || emailData.site_url
  );
  let action = mapEmailAction(emailData.email_action_type);

  // Workaround: Supabase may send "signup" for Magic Link (OTP) authentication.
  // Detect this by checking if user already exists (created_at is recent).
  // Magic Link for existing users should use recovery token fields, not confirmation.
  if (action === "confirmation" && user) {
    // If user was created more than 1 minute ago, this is likely a Magic Link login, not a new signup
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    if (createdAt < oneMinuteAgo) {
      // Existing user - treat as magic link
      action = "magiclink";
    }
  }

  const normalizedEmail = buildNormalizedEmail(emailData, action);

  return NormalizedPayloadSchema.parse({
    email: normalizedEmail,
    siteUrlOverride,
    user,
  });
}

/**
 * 生のメールデータから正規化されたメールオブジェクトを構築
 *
 * email_change アクション用のトークンマッピング（Supabase の後方互換性により命名が逆転）:
 * - 新メールアドレス用: token_new + token_hash
 * - 旧メールアドレス用: token + token_hash_new
 *
 * フォールバック処理は、Supabase のバージョンや設定により一部フィールドが
 * 欠けている場合の互換性維持のために実装されています。
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 各認証アクションタイプごとに条件分岐が必要
function buildNormalizedEmail(
  emailData: GeneratedEmailData,
  action: string
): z.infer<typeof NormalizedEmailSchema> {
  return {
    // 新メールアドレス用トークン（OTP コード）
    change_email_new_token_new:
      action === "email_change"
        ? emailData.token_new || emailData.token || ""
        : undefined,
    // 新メールアドレス用トークンハッシュ（検証用）
    change_email_new_token_new_hash:
      action === "email_change" ? emailData.token_hash || "" : undefined,
    change_email_old_new:
      action === "email_change" ? emailData.old_email : undefined,
    // 旧メールアドレス用トークン（OTP コード）
    change_email_old_token:
      action === "email_change" ? emailData.token || "" : undefined,
    // 旧メールアドレス用トークンハッシュ（検証用）
    change_email_old_token_hash:
      action === "email_change" ? emailData.token_hash_new || "" : undefined,
    confirmation_hash:
      action === "confirmation"
        ? emailData.token_hash || emailData.token || ""
        : undefined,
    confirmation_token:
      action === "confirmation" ? emailData.token || "" : undefined,
    email_action_type: action,
    invite_token: action === "invite" ? emailData.token || "" : undefined,
    invite_token_hash:
      action === "invite"
        ? emailData.token_hash || emailData.token || ""
        : undefined,
    recovery_token:
      action === "recovery" || action === "magiclink"
        ? emailData.token || ""
        : undefined,
    recovery_token_hash:
      action === "recovery" || action === "magiclink"
        ? emailData.token_hash || emailData.token || ""
        : undefined,
  };
}

/**
 * サイトURLを正規化および検証
 */
function normalizeSiteUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const u = new URL(url);
    return u.origin;
  } catch (_error) {
    return url;
  }
}

/**
 * Supabaseの認証アクションを内部アクションタイプにマッピング
 *
 * Note: Supabase may send "signup" for both password-based signup and Magic Link OTP.
 * To distinguish, we check the email_data context in normalizeNewPayload.
 */
function mapEmailAction(action?: string): string {
  switch (action) {
    case "signup":
      return "confirmation";
    case "recovery":
      return "recovery";
    case "magiclink":
      return "magiclink";
    case "email_change":
      return "email_change";
    case "invite":
      return "invite";
    default:
      return action || "";
  }
}
