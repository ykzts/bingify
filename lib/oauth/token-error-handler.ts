import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { deleteOAuthToken, type OAuthProvider } from "./token-storage";

/**
 * OAuthエラーの種類
 */
export const OAuthErrorType = {
  /** トークンが無効化された（401エラー） */
  TOKEN_INVALID: "TOKEN_INVALID",
  /** トークンの権限が不足している（403エラー） */
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  /** リフレッシュトークンが無効 */
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
  /** ネットワークエラー */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** その他のエラー */
  UNKNOWN: "UNKNOWN",
} as const;

export type OAuthErrorType =
  (typeof OAuthErrorType)[keyof typeof OAuthErrorType];

/**
 * エラーハンドリングの結果
 */
export interface ErrorHandlingResult {
  /** エラーの種類 */
  errorType: OAuthErrorType;
  /** トークンが削除されたかどうか */
  tokenDeleted: boolean;
  /** ユーザーに再認証が必要かどうか */
  requiresReauth: boolean;
  /** エラーメッセージ（ログ用） */
  message: string;
  /** プロバイダー名 */
  provider: OAuthProvider;
}

/**
 * HTTPステータスコードまたはエラーメッセージからOAuthエラータイプを判定する
 *
 * @param error - エラーオブジェクト
 * @returns エラータイプ
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: エラー分類には多くの条件が必要
export function classifyOAuthError(error: unknown): OAuthErrorType {
  if (!error) {
    return OAuthErrorType.UNKNOWN;
  }

  // 構造化されたエラーオブジェクトからステータスコードを取得
  if (typeof error === "object") {
    const errorObj = error as {
      status?: number;
      response?: { status?: number };
      code?: number;
    };
    const status =
      errorObj.status || errorObj.response?.status || errorObj.code;

    if (status === 401) {
      return OAuthErrorType.TOKEN_INVALID;
    }
    if (status === 403) {
      return OAuthErrorType.INSUFFICIENT_PERMISSIONS;
    }
  }

  // エラーメッセージベースの判定
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // 401系のエラー
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("invalid credentials") ||
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("token has been expired or revoked")
    ) {
      return OAuthErrorType.TOKEN_INVALID;
    }

    // 403系のエラー
    if (
      errorMessage.includes("403") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("insufficient")
    ) {
      return OAuthErrorType.INSUFFICIENT_PERMISSIONS;
    }

    // リフレッシュトークン固有のエラー
    if (
      errorMessage.includes("refresh token") &&
      (errorMessage.includes("invalid") || errorMessage.includes("expired"))
    ) {
      return OAuthErrorType.REFRESH_TOKEN_INVALID;
    }

    // ネットワークエラー
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("econnrefused")
    ) {
      return OAuthErrorType.NETWORK_ERROR;
    }
  }

  return OAuthErrorType.UNKNOWN;
}

/**
 * プロバイダー固有のエラー分類を行う
 *
 * @param error - エラーオブジェクト
 * @param provider - OAuthプロバイダー
 * @returns エラータイプ
 */
export function classifyProviderError(
  error: unknown,
  provider: OAuthProvider
): OAuthErrorType {
  const baseType = classifyOAuthError(error);

  // プロバイダー固有の追加判定
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (provider === "google") {
      // Googleの固有エラー
      if (
        errorMessage.includes("invalid_grant") ||
        errorMessage.includes("token_expired")
      ) {
        return OAuthErrorType.TOKEN_INVALID;
      }
    } else if (
      provider === "twitch" &&
      errorMessage.includes("invalid token")
    ) {
      // Twitchの固有エラー
      return OAuthErrorType.TOKEN_INVALID;
    }
  }

  return baseType;
}

/**
 * OAuthエラーを処理し、必要に応じてトークンを削除する
 *
 * この関数は以下の処理を行う：
 * 1. エラーの種類を判定
 * 2. トークンが無効な場合は削除
 * 3. ログの記録
 * 4. ハンドリング結果を返す
 *
 * @param supabase - Supabaseクライアント
 * @param error - 発生したエラー
 * @param provider - OAuthプロバイダー
 * @param context - エラー発生のコンテキスト（ログ用）
 * @param userId - ユーザーID（service roleコンテキストで使用）
 * @returns エラーハンドリングの結果
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: エラーハンドリングには多くの条件分岐が必要
export async function handleOAuthError(
  supabase: SupabaseClient<Database>,
  error: unknown,
  provider: OAuthProvider,
  context: string,
  userId?: string
): Promise<ErrorHandlingResult> {
  const errorType = classifyProviderError(error, provider);

  // エラーメッセージを生成
  let errorMessage: string;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error) {
    errorMessage = JSON.stringify(error);
  } else {
    errorMessage = "Unknown error";
  }

  const result: ErrorHandlingResult = {
    errorType,
    message: errorMessage,
    provider,
    requiresReauth: false,
    tokenDeleted: false,
  };

  // トークンが無効な場合は削除して再認証を要求
  if (
    errorType === OAuthErrorType.TOKEN_INVALID ||
    errorType === OAuthErrorType.REFRESH_TOKEN_INVALID
  ) {
    console.error(
      `[OAuth Error Handler] Invalid token detected for ${provider} in ${context}:`,
      errorMessage
    );

    try {
      let deleteResult: {
        deleted?: boolean;
        error?: string;
        provider?: string;
        success: boolean;
      };

      // service roleコンテキスト（userId指定時）は delete_oauth_token_for_user を使用
      if (userId) {
        const { data, error: rpcError } = await supabase.rpc(
          "delete_oauth_token_for_user",
          {
            p_provider: provider,
            p_user_id: userId,
          }
        );

        if (rpcError) {
          deleteResult = {
            error: rpcError.message,
            success: false,
          };
        } else {
          deleteResult = data as unknown as {
            deleted?: boolean;
            error?: string;
            provider?: string;
            success: boolean;
          };
        }
      } else {
        // 通常のユーザーコンテキストは既存の deleteOAuthToken を使用
        deleteResult = await deleteOAuthToken(supabase, provider);
      }

      result.tokenDeleted =
        deleteResult.success && (deleteResult.deleted ?? false);

      if (result.tokenDeleted) {
        console.log(
          `[OAuth Error Handler] Successfully deleted invalid ${provider} token for user${userId ? ` ${userId}` : ""}`
        );
      } else {
        console.warn(
          `[OAuth Error Handler] Failed to delete ${provider} token:`,
          deleteResult.error || "Token may not exist"
        );
      }
    } catch (deleteError) {
      console.error(
        `[OAuth Error Handler] Exception while deleting ${provider} token:`,
        deleteError
      );
    }

    result.requiresReauth = true;
  } else if (errorType === OAuthErrorType.INSUFFICIENT_PERMISSIONS) {
    // 権限不足の場合はログのみ（トークンは有効）
    console.warn(
      `[OAuth Error Handler] Insufficient permissions for ${provider} in ${context}:`,
      errorMessage
    );
  } else if (errorType === OAuthErrorType.NETWORK_ERROR) {
    // ネットワークエラーはログのみ（一時的な問題の可能性）
    console.warn(
      `[OAuth Error Handler] Network error for ${provider} in ${context}:`,
      errorMessage
    );
  } else {
    // その他のエラー
    console.error(
      `[OAuth Error Handler] Unknown error for ${provider} in ${context}:`,
      errorMessage
    );
  }

  return result;
}

/**
 * エラーがトークンの再取得を必要とするかどうかを判定する
 *
 * @param errorType - エラータイプ
 * @returns 再認証が必要な場合はtrue
 */
export function requiresReauthentication(errorType: OAuthErrorType): boolean {
  return (
    errorType === OAuthErrorType.TOKEN_INVALID ||
    errorType === OAuthErrorType.REFRESH_TOKEN_INVALID
  );
}
