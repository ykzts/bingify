import { type NextRequest, NextResponse } from "next/server";
import { normalizeAuthHookPayload } from "@/lib/schemas/auth-hook";
import { getAbsoluteUrl } from "@/lib/utils/url";
import {
  handleEmailAction,
  verifyWebhookSignature,
} from "./_lib/email-handler";

/**
 * Supabaseの認証フックでメール送信リクエストを処理
 *
 * Supabase Authからウェブフックを受け取り、適切なメールテンプレートにルーティングします。
 * すべてのリクエストはHMAC-SHA256署名で検証されます。
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 認証フローのエラーハンドリングには詳細な分岐が必要
export async function POST(request: NextRequest) {
  try {
    // ヘッダーからウェブフック署名を取得
    const signature = request.headers.get("webhook-signature");
    const timestamp = request.headers.get("webhook-timestamp");
    const id = request.headers.get("webhook-id");
    const secret = process.env.SEND_EMAIL_HOOK_SECRETS;

    // 必須ヘッダーとシークレットが存在するか検証
    if (!(signature && timestamp && id && secret)) {
      // 詳細なエラーログを出力（デバッグ用）
      // secretFormatの判定を分離して可読性を向上
      let secretFormat = "not set";
      if (secret) {
        if (secret.startsWith("v1,whsec_")) {
          secretFormat = "v1,whsec_...";
        } else if (secret.startsWith("v1,")) {
          secretFormat = "v1 (incomplete)";
        } else {
          secretFormat = "other";
        }
      }

      console.error("[Auth Hook] Missing required headers or secret:", {
        hasId: !!id,
        hasSecret: !!secret,
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        secretFormat,
      });

      return NextResponse.json(
        {
          details:
            "Missing required webhook headers or SEND_EMAIL_HOOK_SECRETS environment variable",
          error: "Invalid webhook configuration",
        },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.text();

    // セキュリティのためウェブフック署名を検証
    if (
      !verifyWebhookSignature(
        body,
        {
          "webhook-id": id,
          "webhook-signature": signature,
          "webhook-timestamp": timestamp,
        },
        secret
      )
    ) {
      console.error("[Auth Hook] Webhook signature verification failed");
      return NextResponse.json(
        {
          details:
            "HMAC-SHA256 signature verification failed. Check SEND_EMAIL_HOOK_SECRETS configuration.",
          error: "Invalid webhook signature",
        },
        { status: 401 }
      );
    }

    // JSONペイロードを解析（エラーハンドリング付き）
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Zodを使用してペイロードを正規化
    const normalized = normalizeAuthHookPayload(payload);

    if (!normalized) {
      console.error("[Auth Hook] Invalid payload structure:", payload);
      return NextResponse.json(
        {
          details: "Payload does not match expected Supabase Auth Hook format",
          error: "Invalid payload structure",
        },
        { status: 400 }
      );
    }

    const { email, user, siteUrlOverride } = normalized;

    if (!(email && user?.email)) {
      console.error("[Auth Hook] Missing email or user in payload");
      return NextResponse.json(
        {
          details:
            "Required fields (email, user.email) are missing from the payload",
          error: "Invalid payload: missing email or user",
        },
        { status: 400 }
      );
    }

    const { email_action_type } = email;
    const userEmail = user.email;

    // リクエストログ（個人情報を除く）
    console.log("[Auth Hook] Processing email action:", {
      action: email_action_type,
      locale:
        user.app_metadata?.language || user.user_metadata?.language || "en",
      timestamp: new Date().toISOString(),
    });
    const language =
      user.app_metadata?.language || user.user_metadata?.language;
    const locale = language === "ja" ? "ja" : "en";
    // 既定は getAbsoluteUrl() に委譲し、オーバーライドがあれば優先
    const siteUrl = siteUrlOverride || getAbsoluteUrl();

    // メールハンドラーにルーティング
    const emailSent = await handleEmailAction(
      email_action_type,
      email,
      userEmail,
      locale,
      siteUrl
    );

    // 不明なアクションタイプを処理
    if (!emailSent) {
      console.error(
        "[Auth Hook] Unknown email action type:",
        email_action_type
      );
      return NextResponse.json(
        {
          details: "The email_action_type is not supported",
          error: "Unknown email action type",
          type: email_action_type,
        },
        { status: 400 }
      );
    }

    // 成功レスポンスを返す
    console.log(
      "[Auth Hook] Email sent successfully for action:",
      email_action_type
    );
    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth Hook] Error processing request:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for auth hook
 * GET /api/auth/hooks/send-email
 *
 * Use this endpoint to verify that:
 * - The auth hook endpoint is accessible
 * - SEND_EMAIL_HOOK_SECRETS is configured
 * - Required dependencies are available
 */
export function GET() {
  const secret = process.env.SEND_EMAIL_HOOK_SECRETS;
  const hasSecret = !!secret;

  // secretFormatの判定を分離して可読性を向上
  let secretFormat = "not set";
  if (secret) {
    if (secret.startsWith("v1,whsec_")) {
      secretFormat = "valid";
    } else if (secret.startsWith("v1,")) {
      secretFormat = "partial";
    } else {
      secretFormat = "invalid";
    }
  }

  return NextResponse.json(
    {
      configuration: {
        hasSecret,
        secretFormat: hasSecret ? secretFormat : "not set",
      },
      endpoint: "/api/auth/hooks/send-email",
      message: hasSecret
        ? "Auth hook endpoint is configured and ready"
        : "WARNING: SEND_EMAIL_HOOK_SECRETS is not set. Magic Link login will not work.",
      status: "ok",
    },
    { status: hasSecret ? 200 : 503 }
  );
}
