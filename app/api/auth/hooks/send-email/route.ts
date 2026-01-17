import { type NextRequest, NextResponse } from "next/server";
import { AuthHookPayloadSchema } from "@/lib/schemas/auth-hook";
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

    // Zodを使用してペイロードを検証
    const result = AuthHookPayloadSchema.safeParse(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    const { email_data, user } = result.data;

    if (!(email_data && user?.email)) {
      return NextResponse.json(
        { error: "Invalid payload: missing email_data or user" },
        { status: 400 }
      );
    }

    const { email_action_type, redirect_to } = email_data;
    const userEmail = user.email;
    const language =
      user.app_metadata?.language || user.user_metadata?.language;
    const locale = language === "ja" ? "ja" : "en";
    // redirect_to はフロント計算済みの完全パスをそのまま使い、なければローカルの /auth/callback を使う
    const redirectTo = redirect_to ?? getAbsoluteUrl("/auth/callback");

    // email_change イベント時、旧メールアドレスを email_data に追加
    // handleEmailChange で2段階確認（旧メール宛通知 + 新メール宛確認リンク）を処理する
    if (email_action_type === "email_change" && !email_data.old_email) {
      email_data.old_email = user.email;
    }

    // メールハンドラーにルーティング
    const emailSent = await handleEmailAction(
      email_action_type || "",
      email_data,
      userEmail,
      locale,
      redirectTo
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
    console.error("[Auth Hook] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
