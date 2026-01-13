import { z } from "zod";

/**
 * Supabase Auth Hookのメールデータスキーマ
 * 新しい形式（email_dataフィールド）とレガシー形式（emailフィールド）の両方に対応
 *
 * 新しい形式のスキーマはSupabase公式ドキュメントのJSON Schemaをベースに定義
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 * @see ./auth-hook-json-schema.json - 公式JSON Schemaの参照コピー
 */

/**
 * email_dataスキーマ
 * Supabase公式JSON Schemaから派生（すべてのフィールドをoptionalに設定）
 *
 * 注意: JSON Schemaではいくつかのフィールドがrequiredとされていますが、
 * 実際のペイロードは email_action_type に応じて異なるフィールドのみを含むため、
 * すべてoptionalとして定義しています。
 */
const EmailDataSchema = z
  .object({
    email_action_type: z
      .enum([
        "email",
        "email_change",
        "email_changed_notification",
        "identity_linked_notification",
        "identity_unlinked_notification",
        "invite",
        "magiclink",
        "mfa_factor_enrolled_notification",
        "mfa_factor_unenrolled_notification",
        "password_changed_notification",
        "phone_changed_notification",
        "reauthentication",
        "recovery",
        "signup",
      ])
      .optional(),
    factor_type: z.enum(["totp"]).optional(),
    old_email: z.string().optional(),
    old_phone: z.string().optional(),
    provider: z.enum(["email"]).optional(),
    redirect_to: z.string().optional(),
    site_url: z.string().optional(),
    token: z.string().optional(),
    token_hash: z.string().optional(),
    token_hash_new: z.string().optional(),
    token_new: z.string().optional(),
  })
  .optional();

/**
 * userスキーマ
 * Supabase公式JSON Schemaから派生（すべてのフィールドをoptionalに設定）
 *
 * アプリ固有の拡張として、app_metadata と user_metadata に language フィールドを追加
 */
const UserSchema = z
  .object({
    app_metadata: z
      .object({
        language: z.string().optional(),
        provider: z.enum(["email"]).optional(),
        providers: z.array(z.enum(["email"])).optional(),
      })
      // passthroughを使用してSupabaseが将来追加する可能性のあるフィールドを許容
      // アプリ固有のカスタムフィールドも保存可能
      .passthrough()
      .optional(),
    aud: z.enum(["authenticated"]).optional(),
    created_at: z.string().optional(),
    email: z.string().optional(),
    id: z.string().optional(),
    identities: z
      .array(
        z
          .object({
            created_at: z.string().optional(),
            email: z.string().optional(),
            id: z.string().optional(),
            identity_data: z
              .object({
                email: z.string().optional(),
                email_verified: z.boolean().optional(),
                phone_verified: z.boolean().optional(),
                sub: z.string().optional(),
              })
              .passthrough()
              .optional(),
            identity_id: z.string().optional(),
            last_sign_in_at: z.string().optional(),
            provider: z.enum(["email"]).optional(),
            updated_at: z.string().optional(),
            user_id: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
    is_anonymous: z.boolean().optional(),
    phone: z.string().optional(),
    role: z.enum(["anon", "authenticated"]).optional(),
    updated_at: z.string().optional(),
    user_metadata: z
      .object({
        email: z.string().optional(),
        email_verified: z.boolean().optional(),
        language: z.string().optional(),
        phone_verified: z.boolean().optional(),
        sub: z.string().optional(),
      })
      // passthroughを使用してアプリ固有のカスタムメタデータを許容
      .passthrough()
      .optional(),
  })
  // passthroughを使用してSupabaseが追加する可能性のある新しいフィールドを許容
  .passthrough();

// レガシーペイロード構造（emailフィールド）
const LegacyEmailSchema = z.object({
  change_email_new_token_new: z.string().optional(),
  change_email_new_token_new_hash: z.string().optional(),
  change_email_old_new: z.string().optional(),
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
  user: UserSchema.optional(),
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
    return normalizeNewPayload(email_data, user);
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
  emailData: Exclude<z.infer<typeof EmailDataSchema>, undefined>,
  user: z.infer<typeof UserSchema> | undefined
): NormalizedPayload | null {
  const siteUrlOverride = normalizeSiteUrl(
    emailData.redirect_to || emailData.site_url
  );
  const action = mapEmailAction(emailData.email_action_type);

  const normalizedEmail = buildNormalizedEmail(emailData, action);

  return NormalizedPayloadSchema.parse({
    email: normalizedEmail,
    siteUrlOverride,
    user,
  });
}

/**
 * 生のメールデータから正規化されたメールオブジェクトを構築
 */
function buildNormalizedEmail(
  emailData: Exclude<z.infer<typeof EmailDataSchema>, undefined>,
  action: string
): z.infer<typeof NormalizedEmailSchema> {
  return {
    change_email_new_token_new:
      action === "email_change"
        ? emailData.token_new || emailData.token || ""
        : undefined,
    change_email_new_token_new_hash:
      action === "email_change"
        ? emailData.token_hash_new ||
          emailData.token_hash ||
          emailData.token ||
          ""
        : undefined,
    change_email_old_new:
      action === "email_change" ? emailData.old_email : undefined,
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
