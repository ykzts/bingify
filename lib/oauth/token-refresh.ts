import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getOAuthToken, isTokenExpired, upsertOAuthToken } from "./token-storage";
import type { OAuthProvider } from "./token-storage";

/**
 * OAuth プロバイダーごとのトークンリフレッシュエンドポイント
 */
const REFRESH_ENDPOINTS = {
  google: "https://oauth2.googleapis.com/token",
  twitch: "https://id.twitch.tv/oauth2/token",
} as const;

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
  skipped?: boolean;
}

/**
 * リトライ設定
 */
interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
};

/**
 * Google OAuth のトークンをリフレッシュする
 *
 * @param refreshToken - リフレッシュトークン
 * @param retryConfig - リトライ設定
 * @returns 新しいアクセストークン情報
 */
async function refreshGoogleToken(
  refreshToken: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RefreshTokenResponse> {
  const clientId = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return fetchWithRetry(
    REFRESH_ENDPOINTS.google,
    {
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    retryConfig
  );
}

/**
 * Twitch OAuth のトークンをリフレッシュする
 *
 * @param refreshToken - リフレッシュトークン
 * @param retryConfig - リトライ設定
 * @returns 新しいアクセストークン情報
 */
async function refreshTwitchToken(
  refreshToken: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RefreshTokenResponse> {
  const clientId = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Twitch OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return fetchWithRetry(
    REFRESH_ENDPOINTS.twitch,
    {
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    retryConfig
  );
}

/**
 * リトライロジック付きでfetchを実行する
 *
 * @param url - リクエストURL
 * @param options - fetchオプション
 * @param retryConfig - リトライ設定
 * @returns レスポンスデータ
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig
): Promise<RefreshTokenResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryConfig.retryDelayMs * 2 ** (attempt - 1))
      );
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error_description || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        // 再試行不可能なエラー（認証エラーなど）は即座に返す
        if (response.status === 400 || response.status === 401) {
          throw new Error(`Token refresh failed: ${errorMessage}`);
        }

        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }

      const data = (await response.json()) as RefreshTokenResponse;
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // 再試行不可能なエラーは即座に投げる
      if (
        lastError.message.includes("Token refresh failed") ||
        lastError.message.includes("credentials not configured")
      ) {
        throw lastError;
      }

      console.warn(
        `Token refresh attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed:`,
        lastError.message
      );
    }
  }

  throw lastError || new Error("Token refresh failed after all retries");
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
    return {
      error: errorMessage,
      provider,
      refreshed: false,
    };
  }
}
