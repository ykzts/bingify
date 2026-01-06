import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  type RefreshTokenResponse,
  refreshGoogleToken,
  refreshTwitchToken,
} from "@/lib/oauth/token-refresh";
import type { Database } from "@/types/supabase";

/**
 * トークンリフレッシュの結果サマリー
 */
interface RefreshSummary {
  failed: number;
  refreshed: number;
  skipped: number;
  total: number;
}

/**
 * OAuth トークンを定期的にリフレッシュするCronエンドポイント
 *
 * このエンドポイントは、すべてのユーザーのOAuthトークンをチェックし、
 * 期限切れまたは期限切れ間近（5分以内）のトークンをリフレッシュします。
 *
 * @param request - Next.js リクエスト
 * @returns レスポンス
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Cron endpoint with multiple auth and error handling checks
export async function GET(request: NextRequest) {
  try {
    // Cron シークレットで認証
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      if (process.env.NODE_ENV !== "development") {
        console.error(
          "CRON_SECRET is not set. Token refresh endpoint is disabled in non-development environments."
        );
        return NextResponse.json(
          { error: "Missing CRON_SECRET" },
          { status: 500 }
        );
      }

      console.warn(
        "CRON_SECRET is not set. Authentication is bypassed for token refresh endpoint in development."
      );
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Supabase service role クライアントを作成（全ユーザーのトークンにアクセス可能）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // 期限切れ間近または期限切れのトークンを取得（RPC関数を使用）
    const { data: tokens, error: fetchError } = await supabase.rpc(
      "get_expired_oauth_tokens"
    );

    if (fetchError) {
      console.error("Error fetching tokens to refresh:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch tokens" },
        { status: 500 }
      );
    }

    // トークンが見つからない場合は早期リターン
    if (!tokens || tokens.length === 0) {
      console.log("No tokens found that need refreshing");
      return NextResponse.json({
        data: {
          failed: 0,
          message: "No tokens found that need refreshing",
          refreshed: 0,
          skipped: 0,
          total: 0,
        },
      });
    }

    console.log(`Found ${tokens.length} token(s) that need refreshing`);

    // 各トークンをリフレッシュ
    const summary: RefreshSummary = {
      failed: 0,
      refreshed: 0,
      skipped: 0,
      total: tokens.length,
    };

    const failedTokens: Array<{
      error: string;
      provider: string;
      user_id: string;
    }> = [];

    for (const token of tokens) {
      try {
        // リフレッシュトークンを復号化（RPC関数を使用）
        const { data: decryptedSecret, error: secretError } =
          await supabase.rpc("decrypt_secret", {
            p_secret_id: token.refresh_token_secret_id,
          });

        if (secretError || !decryptedSecret) {
          throw new Error(
            secretError?.message || "Failed to decrypt refresh token"
          );
        }

        // プロバイダーごとにリフレッシュ
        let newTokenData: RefreshTokenResponse;
        if (token.provider === "google") {
          newTokenData = await refreshGoogleToken(decryptedSecret);
        } else if (token.provider === "twitch") {
          newTokenData = await refreshTwitchToken(decryptedSecret);
        } else {
          throw new Error(`Unsupported provider: ${token.provider}`);
        }

        // 新しいトークンを保存（upsert_oauth_token_for_user RPC を使用）
        const expiresAt = newTokenData.expires_in
          ? new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
          : null;

        const { data: upsertResult, error: upsertError } = await supabase.rpc(
          "upsert_oauth_token_for_user",
          {
            p_access_token: newTokenData.access_token,
            p_expires_at: expiresAt,
            p_provider: token.provider,
            p_refresh_token: newTokenData.refresh_token || decryptedSecret,
            p_user_id: token.user_id,
          }
        );

        if (upsertError) {
          throw new Error(
            `Failed to save token: ${upsertError.message || "Unknown error"}`
          );
        }

        // Check if upsert was successful
        if (!upsertResult?.success) {
          throw new Error(upsertResult?.error || "Failed to save token");
        }

        summary.refreshed++;
        console.log(
          `Successfully refreshed token for user ${token.user_id} (${token.provider})`
        );
      } catch (err) {
        summary.failed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `Failed to refresh token for user ${token.user_id} (${token.provider}): ${errorMsg}`
        );
        failedTokens.push({
          error: errorMsg,
          provider: token.provider,
          user_id: token.user_id,
        });
      }
    }

    console.log(
      `Token refresh completed: ${summary.refreshed} refreshed, ${summary.skipped} skipped, ${summary.failed} failed`
    );

    return NextResponse.json({
      data: {
        ...summary,
        failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
        message: `Token refresh completed: ${summary.refreshed} refreshed, ${summary.skipped} skipped, ${summary.failed} failed`,
      },
    });
  } catch (error) {
    console.error("Token refresh cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
