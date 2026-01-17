import React from "react";
import { Webhook } from "standardwebhooks";
import { ConfirmationEmail } from "@/emails/auth/confirmation-email";
import { EmailChangeEmail } from "@/emails/auth/email-change-email";
import { EmailChangedNotificationEmail } from "@/emails/auth/email-changed-notification-email";
import { InviteEmail } from "@/emails/auth/invite-email";
import { MagicLinkEmail } from "@/emails/auth/magic-link-email";
import { PasswordChangedNotificationEmail } from "@/emails/auth/password-changed-notification-email";
import { RecoveryEmail } from "@/emails/auth/recovery-email";
import { sendAuthEmail } from "@/lib/mail";
import type { EmailData, NormalizedEmail } from "@/lib/schemas/auth-hook";
import { getAbsoluteUrl } from "@/lib/utils/url";

// ウェブフックシークレットを分割するための正規表現（例：「v1,whsec_xxx」→ 「v1」、「whsec_xxx」）
const SECRET_SEPARATOR_REGEX = /[,\s]+/;

/**
 * HMAC-SHA256を使用してウェブフック署名を検証
 */
export function verifyWebhookSignature(
  payload: string,
  headers: {
    "webhook-id": string;
    "webhook-signature": string;
    "webhook-timestamp": string;
  },
  secret: string
): boolean {
  try {
    const hook = new Webhook(resolveSecret(secret));
    hook.verify(payload, headers);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * シークレット文字列からウェブフック署名値を抽出
 * 形式：「v1,whsec_xxx」 → 「whsec_xxx」を返す
 * または単一値の場合はそのまま返す
 * @param secret - ウェブフックシークレット文字列
 * @returns 署名検証に使用する実際のシークレット値
 * @internal このユーティリティはモジュール内部専用です
 */
function resolveSecret(secret: string): string {
  const maybeParts = secret.split(SECRET_SEPARATOR_REGEX).filter(Boolean);
  if (maybeParts.length >= 2 && maybeParts[0] === "v1") {
    return maybeParts[1];
  }
  return secret;
}

/**
 * 認証確認URLを構築
 * Supabase認証では token_hash が検証用の主キーです
 * token は表示用のOTPコード (6桁など) として使用されます
 */
export function buildVerifyUrl(params: {
  token?: string;
  tokenHash?: string;
  type: string;
  redirectTo: string;
}): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const verificationToken = params.tokenHash || params.token || "";
  const encodedVerificationToken = encodeURIComponent(verificationToken);
  const redirectTo = encodeURIComponent(params.redirectTo);

  if (supabaseUrl) {
    // Supabase /auth/v1/verify は token_hash を期待します
    return `${supabaseUrl}/auth/v1/verify?type=${params.type}&token=${encodedVerificationToken}&redirect_to=${redirectTo}`;
  }

  return getAbsoluteUrl(`/auth/callback?token=${encodedVerificationToken}`);
}

/**
 * メールアドレス変更確認メールを送信
 * 新旧両方のメールアドレスに確認メールを送信する（double_confirm_changes 有効時）
 */
async function handleEmailChange(
  emailData: EmailData,
  userEmail: string,
  locale: string,
  redirectTo: string
): Promise<void> {
  // token_new + token_hash_new → 新メールアドレス用
  const newToken = emailData.token_new || "";
  const newConfirmationUrl = buildVerifyUrl({
    redirectTo,
    token: emailData.token_new,
    tokenHash: emailData.token_hash_new,
    type: "email_change",
  });

  await sendAuthEmail({
    recipient: userEmail,
    subject:
      locale === "ja"
        ? "メールアドレス変更の確認"
        : "Confirm Your Email Change",
    template: React.createElement(EmailChangeEmail, {
      confirmationUrl: newConfirmationUrl,
      locale,
      token: newToken,
    }),
  });

  // token + token_hash → 旧メールアドレス用（古いAPI互換性）
  if (emailData.old_email && emailData.token && emailData.token_hash) {
    const oldToken = emailData.token;
    const oldConfirmationUrl = buildVerifyUrl({
      redirectTo,
      token: emailData.token,
      tokenHash: emailData.token_hash,
      type: "email_change",
    });

    await sendAuthEmail({
      recipient: emailData.old_email,
      subject:
        locale === "ja"
          ? "メールアドレス変更の確認"
          : "Confirm Your Email Change",
      template: React.createElement(EmailChangeEmail, {
        confirmationUrl: oldConfirmationUrl,
        locale,
        token: oldToken,
      }),
    });
  }
}

/**
 * Supabaseの認証アクションタイプに基づいて適切なメールを送信
 *
 * Supabase Authから送信される email_data は以下の構造です:
 * {
 *   "token": "OTPコード (6桁)",
 *   "token_hash": "トークンハッシュ (検証用)",
 *   "token_new": "新トークン (email_change の場合)",
 *   "token_hash_new": "新トークンハッシュ (email_change の場合)",
 *   "redirect_to": "クライアントリダイレクトURL",
 *   "site_url": "サイトURL",
 *   "email_action_type": "signup" | "magiclink" | "recovery" | "email_change" | "invite",
 *   "old_email": "変更前のメールアドレス",
 *   "old_phone": "変更前の電話番号",
 *   "provider": "認証プロバイダー",
 *   "factor_type": "MFAファクタータイプ"
 * }
 *
 * 参考: https://github.com/supabase/auth/blob/v2.185.0/internal/mailer/mailer.go
 */
export async function handleEmailAction(
  emailActionType: string,
  email: NormalizedEmail,
  userEmail: string,
  locale: string,
  siteUrl: string
): Promise<boolean>;
export async function handleEmailAction(
  emailActionType: string,
  emailData: EmailData,
  userEmail: string,
  locale: string,
  redirectTo: string
): Promise<boolean>;
export async function handleEmailAction(
  emailActionType: string,
  emailOrData: NormalizedEmail | EmailData,
  userEmail: string,
  locale: string,
  siteOrRedirect: string
): Promise<boolean> {
  const isNormalized =
    (emailOrData as NormalizedEmail).confirmation_token !== undefined ||
    (emailOrData as NormalizedEmail).change_email_new_token_new !== undefined ||
    (emailOrData as NormalizedEmail).invite_token !== undefined ||
    (emailOrData as NormalizedEmail).recovery_token !== undefined;

  const redirectTo = isNormalized
    ? `${siteOrRedirect}/auth/callback`
    : siteOrRedirect;

  const emailData: EmailData = isNormalized
    ? {
        email_action_type: (emailOrData as NormalizedEmail).email_action_type,
        factor_type: "",
        old_email:
          (emailOrData as NormalizedEmail).change_email_old_new || "",
        old_phone: "",
        provider: "",
        redirect_to: redirectTo,
        site_url: siteOrRedirect,
        token:
          (emailOrData as NormalizedEmail).confirmation_token ||
          (emailOrData as NormalizedEmail).invite_token ||
          (emailOrData as NormalizedEmail).recovery_token ||
          (emailOrData as NormalizedEmail).change_email_old_token ||
          "",
        token_hash:
          (emailOrData as NormalizedEmail).confirmation_hash ||
          (emailOrData as NormalizedEmail).invite_token_hash ||
          (emailOrData as NormalizedEmail).recovery_token_hash ||
          (emailOrData as NormalizedEmail).change_email_new_token_new_hash ||
          "",
        token_hash_new:
          (emailOrData as NormalizedEmail).change_email_old_token_hash || "",
        token_new:
          (emailOrData as NormalizedEmail).change_email_new_token_new || "",
      }
    : (emailOrData as EmailData);
  switch (emailActionType) {
    case "signup": {
      const token = emailData.token || "";
      const confirmationUrl = buildVerifyUrl({
        redirectTo,
        token: emailData.token,
        tokenHash: emailData.token_hash,
        type: "signup",
      });

      await sendAuthEmail({
        recipient: userEmail,
        subject:
          locale === "ja" ? "メールアドレスの確認" : "Confirm Your Email",
        template: React.createElement(ConfirmationEmail, {
          confirmationUrl,
          locale,
          token,
        }),
      });
      return true;
    }

    case "invite": {
      const token = emailData.token || "";
      const confirmationUrl = buildVerifyUrl({
        redirectTo,
        token: emailData.token,
        tokenHash: emailData.token_hash,
        type: "invite",
      });

      await sendAuthEmail({
        recipient: userEmail,
        subject:
          locale === "ja" ? "Bingifyへのお招待" : "You're Invited to Bingify",
        template: React.createElement(InviteEmail, {
          confirmationUrl,
          locale,
          token,
        }),
      });
      return true;
    }

    case "recovery": {
      const token = emailData.token || "";
      const confirmationUrl = buildVerifyUrl({
        redirectTo,
        token: emailData.token,
        tokenHash: emailData.token_hash,
        type: "recovery",
      });

      await sendAuthEmail({
        recipient: userEmail,
        subject:
          locale === "ja" ? "パスワードのリセット" : "Reset Your Password",
        template: React.createElement(RecoveryEmail, {
          confirmationUrl,
          locale,
          token,
        }),
      });
      return true;
    }

    case "magiclink": {
      const token = emailData.token || "";
      const confirmationUrl = buildVerifyUrl({
        redirectTo,
        token: emailData.token,
        tokenHash: emailData.token_hash,
        type: "magiclink",
      });

      await sendAuthEmail({
        recipient: userEmail,
        subject: locale === "ja" ? "Bingifyにログイン" : "Sign In to Bingify",
        template: React.createElement(MagicLinkEmail, {
          confirmationUrl,
          locale,
          token,
        }),
      });
      return true;
    }

    case "email_change": {
      await handleEmailChange(emailData, userEmail, locale, redirectTo);
      return true;
    }

    case "email_changed": {
      await sendAuthEmail({
        recipient: userEmail,
        subject:
          locale === "ja"
            ? "メールアドレスが変更されました"
            : "Email Address Changed",
        template: React.createElement(EmailChangedNotificationEmail, {
          locale,
          newEmail: userEmail,
        }),
      });
      return true;
    }

    case "password_changed": {
      await sendAuthEmail({
        recipient: userEmail,
        subject:
          locale === "ja"
            ? "パスワードが変更されました"
            : "Your Password Has Been Changed",
        template: React.createElement(PasswordChangedNotificationEmail, {
          locale,
        }),
      });
      return true;
    }

    default:
      return false;
  }
}
