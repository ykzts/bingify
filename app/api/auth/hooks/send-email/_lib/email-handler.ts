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
import type { NormalizedEmail } from "@/lib/schemas/auth-hook";
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
 * Supabaseの認証アクションタイプに基づいて適切なメールを送信
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 認証アクションの種類ごとに分岐が必要なため
export async function handleEmailAction(
  emailActionType: string,
  email: NormalizedEmail,
  userEmail: string,
  locale: string,
  siteUrl: string
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const buildVerifyUrl = (params: {
    token?: string;
    tokenHash?: string;
    type: string;
  }) => {
    // Magic Linkによるメール確認では、Supabaseは token_hash（長いハッシュ値）が必須
    // confirmation_token（OTPコード）ではなく、ハッシュ値がデータベースに保存されています。
    // 参考: https://supabase.com/docs/guides/auth/auth-magic-link (PKCE フロー)
    const verificationToken = params.tokenHash || params.token || "";
    const encodedVerificationToken = encodeURIComponent(verificationToken);
    const redirectTo = encodeURIComponent(siteUrl);

    if (supabaseUrl) {
      // Magic Link フローでのメール確認には token_hash パラメータを使用
      // 注意: パラメータ名は「token」ですが、Supabase /auth/v1/verify はハッシュ値を期待します
      const url = `${supabaseUrl}/auth/v1/verify?type=${params.type}&token=${encodedVerificationToken}&redirect_to=${redirectTo}`;
      return url;
    }

    // アプリルートへのフォールバック（ルートがない場合は404かもしれませんが、空のリンクを避けます）
    return getAbsoluteUrl(`/auth/confirm?token=${encodedVerificationToken}`);
  };

  switch (emailActionType) {
    case "confirmation": {
      const token = email.confirmation_token || email.confirmation_hash || "";
      const confirmationUrl = buildVerifyUrl({
        token: email.confirmation_token,
        tokenHash: email.confirmation_hash,
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
      const token = email.invite_token || email.invite_token_hash || "";
      const confirmationUrl = buildVerifyUrl({
        token: email.invite_token,
        tokenHash: email.invite_token_hash,
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
      const token = email.recovery_token || email.recovery_token_hash || "";
      const confirmationUrl = buildVerifyUrl({
        token: email.recovery_token,
        tokenHash: email.recovery_token_hash,
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
      const token = email.recovery_token || email.recovery_token_hash || "";
      const confirmationUrl = buildVerifyUrl({
        token: email.recovery_token,
        tokenHash: email.recovery_token_hash,
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
      // Supabase の double_confirm_changes = true の場合、
      // 新旧両方のメールアドレスに確認メールを送信する必要がある。
      // トークンマッピング（後方互換性のため命名が逆転している）:
      // - token_new + token_hash → 新メールアドレス用
      // - token + token_hash_new → 旧メールアドレス用

      const oldEmail = email.change_email_old_new;

      // 新メールアドレスへの確認メール送信
      // メールテンプレートの OTP 表示用にトークンを取得（通常は6桁の数字）
      const newToken = email.change_email_new_token_new || "";
      const newConfirmationUrl = buildVerifyUrl({
        token: email.change_email_new_token_new,
        tokenHash: email.change_email_new_token_new_hash,
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

      // 旧メールアドレスへの確認メール送信（double_confirm_changes 有効時）
      if (
        oldEmail &&
        email.change_email_old_token &&
        email.change_email_old_token_hash
      ) {
        const oldToken = email.change_email_old_token;
        const oldConfirmationUrl = buildVerifyUrl({
          token: email.change_email_old_token,
          tokenHash: email.change_email_old_token_hash,
          type: "email_change",
        });

        await sendAuthEmail({
          recipient: oldEmail,
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
