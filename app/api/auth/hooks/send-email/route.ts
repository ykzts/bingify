import { type NextRequest, NextResponse } from "next/server";
import { normalizeAuthHookPayload } from "@/lib/schemas/auth-hook";
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
export async function POST(request: NextRequest) {
  try {
    // ヘッダーからウェブフック署名を取得
    const signature = request.headers.get("webhook-signature");
    const timestamp = request.headers.get("webhook-timestamp");
    const id = request.headers.get("webhook-id");
    const secret = process.env.SEND_EMAIL_HOOK_SECRETS;

    // 必須ヘッダーとシークレットが存在するか検証
    if (!(signature && timestamp && id && secret)) {
      return NextResponse.json(
        { error: "Invalid webhook configuration" },
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
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Zodを使用してペイロードを解析および正規化
    const payload = JSON.parse(body);
    const normalized = normalizeAuthHookPayload(payload);

    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    const { email, user, siteUrlOverride } = normalized;

    if (!(email && user?.email)) {
      return NextResponse.json(
        { error: "Invalid payload: missing email or user" },
        { status: 400 }
      );
    }

    const { email_action_type } = email;
    const userEmail = user.email;
    const language =
      user.app_metadata?.language || user.user_metadata?.language;
    const locale = language === "ja" ? "ja" : "en";
    const siteUrl =
      siteUrlOverride ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://bingify.example.com";

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
      return NextResponse.json(
        { error: "Unknown email action type", type: email_action_type },
        { status: 400 }
      );
    }

    // 成功レスポンスを返す
    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
