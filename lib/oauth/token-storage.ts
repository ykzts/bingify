import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/supabase";

export type OAuthProvider = "google" | "twitch";

export interface OAuthToken {
  access_token: string;
  created_at: string;
  expires_at: string | null;
  provider: string;
  refresh_token: string | null;
  updated_at: string;
}

export interface UpsertTokenParams {
  provider: OAuthProvider;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
}

export interface TokenResult {
  error?: string;
  success: boolean;
}

export interface GetTokenResult extends TokenResult {
  access_token?: string;
  created_at?: string;
  expires_at?: string | null;
  provider?: string;
  refresh_token?: string | null;
  updated_at?: string;
}

/**
 * Zodスキーマ: データベースから返されるトークンデータの構造
 */
const tokenDataSchema = z.object({
  provider: z.string(),
  access_token: z.string(),
  refresh_token: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

/**
 * Zodスキーマ: データベースRPCレスポンスの構造
 * 成功時: { success: true, data: { provider, access_token, ... } }
 * エラー時: { success: false, error: string }
 */
const rpcResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: tokenDataSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string().optional(),
  }),
]);

export interface DeleteTokenResult extends TokenResult {
  deleted?: boolean;
  provider?: string;
}

/**
 * OAuth トークンを安全に保存する
 * データベースの private スキーマに暗号化されて保存される
 *
 * @param supabase - Supabase クライアント（認証済み）
 * @param params - トークンパラメータ
 * @returns 保存結果
 */
export async function upsertOAuthToken(
  supabase: SupabaseClient<Database>,
  params: UpsertTokenParams
): Promise<TokenResult> {
  try {
    const { data, error } = await supabase.rpc("upsert_oauth_token", {
      p_access_token: params.access_token,
      p_expires_at: params.expires_at ?? undefined,
      p_provider: params.provider,
      p_refresh_token: params.refresh_token ?? undefined,
    });

    if (error) {
      console.error("Error upserting OAuth token:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: "Invalid response from database",
        success: false,
      };
    }

    const result = data as unknown as TokenResult;
    return result;
  } catch (err) {
    console.error("Exception upserting OAuth token:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * データベースのRPCレスポンスからトークン情報を抽出するヘルパー関数
 * Zodスキーマで型安全にバリデーションを実行
 *
 * @param data - データベースから返されたレスポンス
 * @returns パース済みのトークン情報
 */
function parseTokenResponse(data: unknown): GetTokenResult {
  // Zodでレスポンスをバリデーション
  const parseResult = rpcResponseSchema.safeParse(data);

  if (!parseResult.success) {
    return {
      error: `Invalid response structure: ${parseResult.error.message}`,
      success: false,
    };
  }

  const response = parseResult.data;

  // エラーレスポンスの場合
  if (!response.success) {
    return {
      error: response.error || "Unknown error",
      success: false,
    };
  }

  // 成功レスポンスの場合、トークンデータを返す
  const tokenData = response.data;

  return {
    success: true,
    provider: tokenData.provider,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? undefined,
    expires_at: tokenData.expires_at ?? undefined,
  };
}

/**
 * OAuth トークンを取得する
 * データベースから復号化されたトークンが返される
 *
 * @param supabase - Supabase クライアント（認証済み）
 * @param provider - OAuth プロバイダー名
 * @returns トークン情報
 */
export async function getOAuthToken(
  supabase: SupabaseClient<Database>,
  provider: OAuthProvider
): Promise<GetTokenResult> {
  try {
    const { data, error } = await supabase.rpc("get_oauth_token", {
      p_provider: provider,
    });

    if (error) {
      console.error("Error getting OAuth token:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    return parseTokenResponse(data);
  } catch (err) {
    console.error("Exception getting OAuth token:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * OAuth トークンを削除する
 *
 * @param supabase - Supabase クライアント（認証済み）
 * @param provider - OAuth プロバイダー名
 * @returns 削除結果
 */
export async function deleteOAuthToken(
  supabase: SupabaseClient<Database>,
  provider: OAuthProvider
): Promise<DeleteTokenResult> {
  try {
    const { data, error } = await supabase.rpc("delete_oauth_token", {
      p_provider: provider,
    });

    if (error) {
      console.error("Error deleting OAuth token:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        error: "Invalid response from database",
        success: false,
      };
    }

    const result = data as unknown as DeleteTokenResult;
    return result;
  } catch (err) {
    console.error("Exception deleting OAuth token:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * トークンが有効期限切れかどうかをチェックする
 *
 * @param expiresAt - 有効期限（ISO 8601形式）
 * @returns 有効期限切れの場合 true
 */
export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }

  try {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    // 5分のバッファを持たせる
    const bufferMs = 5 * 60 * 1000;
    return expiryTime - bufferMs <= now;
  } catch {
    return false;
  }
}

/**
 * 指定したユーザーのOAuth トークンを取得する（管理者権限）
 * スペース所有者のトークンを取得する際に使用
 *
 * @param userId - 取得対象のユーザーID
 * @param provider - OAuth プロバイダー名
 * @returns トークン情報
 */
export async function getOAuthTokenForUser(
  userId: string,
  provider: OAuthProvider
): Promise<GetTokenResult> {
  try {
    // 管理者クライアントを使用してトークンを取得
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc("get_oauth_token_for_user", {
      p_provider: provider,
      p_user_id: userId,
    });

    if (error) {
      console.error("Error getting OAuth token for user:", error);
      return {
        error: error.message,
        success: false,
      };
    }

    return parseTokenResponse(data);
  } catch (err) {
    console.error("Exception getting OAuth token for user:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * リフレッシュ中のプロバイダーを追跡するための Map
 * 同時リクエストでの重複リフレッシュを防ぐためのロック機構
 */
const refreshLocks = new Map<string, Promise<GetTokenResult>>();

/**
 * OAuth トークンを取得し、期限切れの場合は自動的にリフレッシュする
 * 同時リクエストでの重複リフレッシュを防ぐロック機構を実装
 *
 * @param supabase - Supabase クライアント（認証済み）
 * @param provider - OAuth プロバイダー名
 * @returns トークン情報（リフレッシュ済み）
 */
export async function getOAuthTokenWithRefresh(
  supabase: SupabaseClient<Database>,
  provider: OAuthProvider
): Promise<GetTokenResult> {
  try {
    // ユーザーIDを取得してロックキーを生成
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: "User not authenticated",
        success: false,
      };
    }

    const lockKey = `${user.id}-${provider}`;

    // 既に別のリクエストがリフレッシュ中の場合は、その結果を待つ
    const existingRefresh = refreshLocks.get(lockKey);
    if (existingRefresh) {
      return await existingRefresh;
    }

    // レースコンディションを防ぐため、即座にロックを設定
    // Promise を作成し、トークン取得とリフレッシュ処理を内部で実行
    const refreshPromise = (async () => {
      try {
        // トークンを取得
        const tokenResult = await getOAuthToken(supabase, provider);

        if (!tokenResult.success) {
          return tokenResult;
        }

        // トークンが有効期限切れでない場合はそのまま返す
        if (!isTokenExpired(tokenResult.expires_at)) {
          return tokenResult;
        }

        // リフレッシュトークンがない場合はエラーを返す
        if (!tokenResult.refresh_token) {
          return {
            error: "Token expired and no refresh token available",
            success: false,
          };
        }

        // refreshOAuthToken を動的にインポート（循環依存回避）
        const { refreshOAuthToken } = await import("./token-refresh");
        const refreshResult = await refreshOAuthToken(supabase, provider);

        if (!refreshResult.refreshed) {
          return {
            error: refreshResult.error || "Failed to refresh token",
            success: false,
          };
        }

        // リフレッシュ後の新しいトークンを取得
        return await getOAuthToken(supabase, provider);
      } finally {
        // リフレッシュ完了後、ロックを解除
        refreshLocks.delete(lockKey);
      }
    })();

    // ロックに登録（レースコンディション回避のため、Promise作成直後に設定）
    refreshLocks.set(lockKey, refreshPromise);

    return await refreshPromise;
  } catch (err) {
    console.error("Exception in getOAuthTokenWithRefresh:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * 指定したユーザーのOAuth トークンを取得し、期限切れの場合は自動的にリフレッシュする（管理者権限）
 * 同時リクエストでの重複リフレッシュを防ぐロック機構を実装
 *
 * @param userId - 取得対象のユーザーID
 * @param provider - OAuth プロバイダー名
 * @returns トークン情報（リフレッシュ済み）
 */
export async function getOAuthTokenForUserWithRefresh(
  userId: string,
  provider: OAuthProvider
): Promise<GetTokenResult> {
  try {
    const lockKey = `admin-${userId}-${provider}`;

    // 既に別のリクエストがリフレッシュ中の場合は、その結果を待つ
    const existingRefresh = refreshLocks.get(lockKey);
    if (existingRefresh) {
      return await existingRefresh;
    }

    // レースコンディションを防ぐため、即座にロックを設定
    // Promise を作成し、トークン取得とリフレッシュ処理を内部で実行
    const refreshPromise = (async () => {
      try {
        // トークンを取得
        const tokenResult = await getOAuthTokenForUser(userId, provider);

        if (!tokenResult.success) {
          return tokenResult;
        }

        // トークンが有効期限切れでない場合はそのまま返す
        if (!isTokenExpired(tokenResult.expires_at)) {
          return tokenResult;
        }

        // リフレッシュトークンがない場合はエラーを返す
        if (!tokenResult.refresh_token) {
          return {
            error: "Token expired and no refresh token available",
            success: false,
          };
        }

        // 管理者用のリフレッシュ処理を直接実装
        const { refreshGoogleToken, refreshTwitchToken } = await import(
          "./token-refresh"
        );

        // プロバイダーごとにリフレッシュ
        let newTokenData: {
          access_token: string;
          expires_in?: number;
          refresh_token?: string;
        };

        // ここではrefresh_tokenが必ず存在することは既にチェック済み
        const refreshToken = tokenResult.refresh_token as string;

        if (provider === "google") {
          newTokenData = await refreshGoogleToken(refreshToken);
        } else if (provider === "twitch") {
          newTokenData = await refreshTwitchToken(refreshToken);
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // 新しいトークンを保存（管理者クライアント使用）
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();

        const expiresAt = newTokenData.expires_in
          ? new Date(Date.now() + newTokenData.expires_in * 1000).toISOString()
          : null;

        const { data: upsertData, error: upsertError } = await adminClient.rpc(
          "upsert_oauth_token_for_user",
          {
            p_access_token: newTokenData.access_token,
            p_expires_at: expiresAt ?? undefined,
            p_provider: provider,
            p_refresh_token:
              newTokenData.refresh_token ??
              tokenResult.refresh_token ??
              undefined,
            p_user_id: userId,
          }
        );

        if (upsertError || !upsertData) {
          throw new Error(
            upsertError?.message || "Failed to save refreshed token"
          );
        }

        // リフレッシュ後の新しいトークンを取得
        return await getOAuthTokenForUser(userId, provider);
      } finally {
        // リフレッシュ完了後、ロックを解除
        refreshLocks.delete(lockKey);
      }
    })();

    // ロックに登録（レースコンディション回避のため、Promise作成直後に設定）
    refreshLocks.set(lockKey, refreshPromise);

    return await refreshPromise;
  } catch (err) {
    console.error("Exception in getOAuthTokenForUserWithRefresh:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error",
      success: false,
    };
  }
}
