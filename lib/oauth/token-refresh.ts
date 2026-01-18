import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getGoogleCredentials,
  getTwitchCredentials,
} from "@/lib/oauth-credentials";
import type { Database } from "@/types/supabase";
import { handleOAuthError } from "./token-error-handler";
import type { OAuthProvider } from "./token-storage";
import {
  getOAuthToken,
  isTokenExpired,
  upsertOAuthToken,
} from "./token-storage";

/**
 * リフレッシュトークンレスポンス
 */
export interface RefreshTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
}

/**
 * トークンリフレッシュ結果
 */
export interface RefreshResult {
  error?: string;
  provider: OAuthProvider;
  refreshed: boolean;
  /** リフレッシュがスキップされた場合 */
  skipped?: boolean;
  /** トークンが無効で削除された場合 */
  tokenDeleted?: boolean;
}

/**
 * Google OAuth のトークンをリフレッシュする
 *
 * google-auth-library を使用することも検討しましたが、
 * テストの複雑さと一貫性のため、fetch APIを直接使用しています。
 *
 * @param refreshToken - リフレッシュトークン
 * @returns 新しいアクセストークン情報
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const credentials = await getGoogleCredentials();

  if (!(credentials.clientId && credentials.clientSecret)) {
    throw new Error("Google OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to refresh Google token: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Twitch OAuth のトークンをリフレッシュする
 *
 * @param refreshToken - リフレッシュトークン
 * @returns 新しいアクセストークン情報
 */
export async function refreshTwitchToken(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const credentials = await getTwitchCredentials();

  if (!(credentials.clientId && credentials.clientSecret)) {
    throw new Error("Twitch OAuth credentials not configured");
  }

  // Use direct fetch API for token refresh
  // @twurple/auth's RefreshingAuthProvider is designed for long-lived providers,
  // not one-off token refresh operations
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to refresh Twitch token: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

/**
 * 単一ユーザーのトークンをリフレッシュする
 *
 * @param supabase - Supabase クライアント
 * @param provider - OAuth プロバイダー
 * @returns リフレッシュ結果
 */
export async function refreshOAuthToken(
  supabase: SupabaseClient<Database>,
  provider: OAuthProvider
): Promise<RefreshResult> {
  try {
    // 現在のトークンを取得
    const tokenResult = await getOAuthToken(supabase, provider);

    if (!tokenResult.success) {
      return {
        error: tokenResult.error || "Failed to get token",
        provider,
        refreshed: false,
      };
    }

    // トークンが期限切れかチェック
    if (!isTokenExpired(tokenResult.expires_at)) {
      return {
        provider,
        refreshed: false,
        skipped: true,
      };
    }

    // リフレッシュトークンがない場合はスキップ
    if (!tokenResult.refresh_token) {
      return {
        error: "No refresh token available",
        provider,
        refreshed: false,
        skipped: true,
      };
    }

    // プロバイダーごとにリフレッシュ
    let newTokenData: RefreshTokenResponse;
    if (provider === "google") {
      newTokenData = await refreshGoogleToken(tokenResult.refresh_token);
    } else if (provider === "twitch") {
      newTokenData = await refreshTwitchToken(tokenResult.refresh_token);
    } else {
      return {
        error: `Unsupported provider: ${provider}`,
        provider,
        refreshed: false,
      };
    }

    // 新しいトークンを保存
    const expiresAt = newTokenData.expires_in
      ? new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
      : null;

    const upsertResult = await upsertOAuthToken(supabase, {
      access_token: newTokenData.access_token,
      expires_at: expiresAt,
      provider,
      // 新しいリフレッシュトークンが返された場合は更新、なければ既存を保持
      refresh_token: newTokenData.refresh_token || tokenResult.refresh_token,
    });

    if (!upsertResult.success) {
      return {
        error: upsertResult.error || "Failed to save refreshed token",
        provider,
        refreshed: false,
      };
    }

    return {
      provider,
      refreshed: true,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // エラーハンドリング：無効なトークンの場合は削除
    const errorResult = await handleOAuthError(
      supabase,
      err,
      provider,
      "token refresh"
    );

    return {
      error: errorMessage,
      provider,
      refreshed: false,
      tokenDeleted: errorResult.tokenDeleted,
    };
  }
}
