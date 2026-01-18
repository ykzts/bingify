import { ApiClient } from "@twurple/api";
import { getAppToken, getTokenInfo, StaticAuthProvider } from "@twurple/auth";
import { getTwitchCredentials } from "@/lib/oauth-credentials";

// Regex patterns for parsing Twitch input
export const TWITCH_ID_REGEX = /^\d+$/;
const TWITCH_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{4,25})$/;
const TWITCH_USERNAME_REGEX = /^[a-zA-Z0-9_]{4,25}$/;

// App access token cache
let cachedAppToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

export interface TwitchFollowCheckResult {
  error?: string;
  isFollowing: boolean;
}

export interface TwitchSubCheckResult {
  error?: string;
  isSubscribed: boolean;
}

export interface TwitchUserLookupResult {
  broadcasterId?: string;
  error?: string;
}

export interface TwitchUserIdResult {
  error?: string;
  userId?: string;
}

export interface ParsedTwitchInput {
  type: "id" | "username" | "invalid";
  value: string;
}

/**
 * Validate common parameters for Twitch API calls
 */
async function validateTwitchParameters(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): Promise<{ error?: string; valid: boolean }> {
  if (!userAccessToken) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!userId) {
    return { error: "Missing required parameters", valid: false };
  }

  if (!broadcasterId) {
    return { error: "Missing required parameters", valid: false };
  }

  const credentials = await getTwitchCredentials();
  if (!credentials.clientId) {
    return { error: "Twitch client ID not configured", valid: false };
  }

  return { valid: true };
}

/**
 * Create Twurple API client with user access token
 */
async function createApiClient(userAccessToken: string): Promise<ApiClient> {
  const credentials = await getTwitchCredentials();
  if (!credentials.clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(
    credentials.clientId,
    userAccessToken
  );
  return new ApiClient({ authProvider });
}

/**
 * Create Twurple API client with app access token for server-side operations
 */
async function createAppApiClient(appAccessToken: string): Promise<ApiClient> {
  const credentials = await getTwitchCredentials();
  if (!credentials.clientId) {
    throw new Error("Twitch client ID not configured");
  }

  const authProvider = new StaticAuthProvider(
    credentials.clientId,
    appAccessToken
  );
  return new ApiClient({ authProvider });
}

/**
 * 参加者のTwitchユーザーIDを取得する
 * 参加者自身のアクセストークンを使用してユーザーIDを取得
 *
 * @param userAccessToken - 参加者のTwitch OAuthアクセストークン
 * @returns ユーザーID or エラー
 */
export async function getUserTwitchId(
  userAccessToken: string
): Promise<TwitchUserIdResult> {
  try {
    if (!userAccessToken) {
      return {
        error: "Missing access token",
      };
    }

    const credentials = await getTwitchCredentials();
    if (!credentials.clientId) {
      return {
        error: "Twitch client ID not configured",
      };
    }

    const tokenInfo = await getTokenInfo(userAccessToken, credentials.clientId);

    if (tokenInfo.userId) {
      return { userId: tokenInfo.userId };
    }

    return {
      error: "Failed to get user information",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get app access token for Twitch API using client credentials flow
 * Tokens are cached and reused until they expire
 * @returns Promise with access token or null if failed
 */
export async function getAppAccessToken(): Promise<string | null> {
  const credentials = await getTwitchCredentials();

  if (!(credentials.clientId && credentials.clientSecret)) {
    return null;
  }

  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt > now) {
    return cachedAppToken.accessToken;
  }

  try {
    const token = await getAppToken(
      credentials.clientId,
      credentials.clientSecret
    );

    // Cache the token with expiration
    // Expire 5 minutes before actual expiration for safety margin
    const expiresInMs = (token.expiresIn || 3600) * 1000;
    const safetyMarginMs = 5 * 60 * 1000; // 5 minutes
    cachedAppToken = {
      accessToken: token.accessToken,
      expiresAt: now + expiresInMs - safetyMarginMs,
    };

    return token.accessToken;
  } catch (error) {
    console.error("Failed to get Twitch app access token:", error);
    return null;
  }
}

/**
 * Parse Twitch input to extract username or detect if it's already a numeric ID
 * Supports:
 * - Numeric ID: "123456789"
 * - Username: "ninja"
 * - URL: "https://www.twitch.tv/ninja" or "https://twitch.tv/ninja" or "twitch.tv/ninja"
 */
export function parseTwitchInput(input: string): ParsedTwitchInput {
  const trimmed = input.trim();

  if (!trimmed) {
    return { type: "invalid", value: "" };
  }

  // Check if it's a numeric ID (digits only)
  if (TWITCH_ID_REGEX.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Check if it's a URL
  const match = trimmed.match(TWITCH_URL_REGEX);
  if (match?.[1]) {
    return { type: "username", value: match[1].toLowerCase() };
  }

  // Check if it's a valid username (4-25 characters, alphanumeric + underscore)
  if (TWITCH_USERNAME_REGEX.test(trimmed)) {
    return { type: "username", value: trimmed.toLowerCase() };
  }

  return { type: "invalid", value: trimmed };
}

/**
 * Get Twitch broadcaster ID from username using app access token
 * @param username - Twitch username
 * @param appAccessToken - App access token for Twitch API
 * @returns Promise with broadcaster ID or error
 */
export async function getBroadcasterIdFromUsername(
  username: string,
  appAccessToken: string
): Promise<TwitchUserLookupResult> {
  try {
    if (!username) {
      return { error: "Username is required" };
    }

    if (!appAccessToken) {
      return { error: "App access token is required" };
    }

    const credentials = await getTwitchCredentials();
    if (!credentials.clientId) {
      return { error: "Twitch client ID not configured" };
    }

    const apiClient = await createAppApiClient(appAccessToken);
    const users = await apiClient.users.getUsersByNames([username]);

    if (users.length === 0) {
      return { error: "User not found" };
    }

    return { broadcasterId: users[0].id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface TwitchLookupResult {
  broadcasterId?: string;
  error?: string;
  source?: "id" | "username";
  username?: string;
}

/**
 * Lookup Twitch broadcaster ID from username, URL, or numeric ID
 * This combines parsing and API lookup in a single function
 * @param input - Twitch username, channel URL, or numeric ID
 * @returns Promise with broadcaster ID or error
 */
export async function lookupTwitchBroadcaster(
  input: string
): Promise<TwitchLookupResult> {
  try {
    if (!input || typeof input !== "string") {
      return { error: "Input is required" };
    }

    // Parse the input to determine type
    const parsed = parseTwitchInput(input);

    if (parsed.type === "invalid") {
      return {
        error:
          "Invalid input. Please enter a Twitch username, channel URL, or numeric ID.",
      };
    }

    // If it's already an ID, return it as-is
    if (parsed.type === "id") {
      return {
        broadcasterId: parsed.value,
        source: "id",
      };
    }

    // It's a username, so look it up using twurple
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      return { error: "Service temporarily unavailable" };
    }

    const result = await getBroadcasterIdFromUsername(
      parsed.value,
      appAccessToken
    );

    if (result.error) {
      return { error: result.error };
    }

    return {
      broadcasterId: result.broadcasterId,
      source: "username",
      username: parsed.value,
    };
  } catch (error) {
    console.error("Error in Twitch lookup:", error);
    return { error: "Internal server error" };
  }
}

/**
 * Check if a user follows a broadcaster on Twitch
 * @param userAccessToken - User's Twitch access token
 * @param userId - Twitch user ID to check
 * @param broadcasterId - Twitch broadcaster ID to check against
 * @returns Promise with follow status
 */
export async function checkFollowStatus(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): Promise<TwitchFollowCheckResult> {
  try {
    const validation = await validateTwitchParameters(
      userAccessToken,
      userId,
      broadcasterId
    );
    if (!validation.valid) {
      return {
        error: validation.error,
        isFollowing: false,
      };
    }

    const apiClient = await createApiClient(userAccessToken);
    const follow = await apiClient.channels.getChannelFollowers(
      broadcasterId,
      userId
    );

    return {
      isFollowing: follow.data.length > 0,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isFollowing: false,
    };
  }
}

/**
 * 参加者が配信者をフォローしているかチェックする（管理者トークン使用）
 *
 * 検証フロー:
 * 1. 参加者のトークンで参加者のTwitchユーザーIDを取得
 * 2. 管理者（配信者）のトークンでフォロー状態をチェック
 *
 * @param participantAccessToken - 参加者のTwitch OAuthアクセストークン
 * @param adminAccessToken - スペース管理者（配信者）のTwitch OAuthアクセストークン
 * @param broadcasterId - チェック対象の配信者ID
 * @returns フォロー状態
 */
export async function checkFollowWithAdminToken(
  participantAccessToken: string,
  adminAccessToken: string,
  broadcasterId: string
): Promise<TwitchFollowCheckResult> {
  try {
    if (!(participantAccessToken && adminAccessToken && broadcasterId)) {
      return {
        error: "Missing required parameters",
        isFollowing: false,
      };
    }

    // 1. 参加者のTwitchユーザーIDを取得
    const participantIdResult = await getUserTwitchId(participantAccessToken);

    if (participantIdResult.error || !participantIdResult.userId) {
      return {
        error: participantIdResult.error || "Failed to get participant ID",
        isFollowing: false,
      };
    }

    // 2. 管理者（配信者）のトークンでフォロー状態をチェック
    const apiClient = await createApiClient(adminAccessToken);
    const follow = await apiClient.channels.getChannelFollowers(
      broadcasterId,
      participantIdResult.userId
    );

    return {
      isFollowing: follow.data.length > 0,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isFollowing: false,
    };
  }
}

/**
 * Check if a user is subscribed to a broadcaster on Twitch
 * @param userAccessToken - User's Twitch access token
 * @param userId - Twitch user ID to check
 * @param broadcasterId - Twitch broadcaster ID to check against
 * @returns Promise with subscription status
 */
export async function checkSubStatus(
  userAccessToken: string,
  userId: string,
  broadcasterId: string
): Promise<TwitchSubCheckResult> {
  try {
    const validation = await validateTwitchParameters(
      userAccessToken,
      userId,
      broadcasterId
    );
    if (!validation.valid) {
      return {
        error: validation.error,
        isSubscribed: false,
      };
    }

    const apiClient = await createApiClient(userAccessToken);
    const subscription = await apiClient.subscriptions.checkUserSubscription(
      userId,
      broadcasterId
    );

    return {
      isSubscribed: subscription !== null,
    };
  } catch (error) {
    // Twurple throws an error if not subscribed
    if (error instanceof Error && error.message.includes("404")) {
      return {
        isSubscribed: false,
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}

/**
 * 参加者が配信者にサブスクライブしているかチェックする（管理者トークン使用）
 *
 * 検証フロー:
 * 1. 参加者のトークンで参加者のTwitchユーザーIDを取得
 * 2. 管理者（配信者）のトークンでサブスクリプション状態をチェック
 *
 * @param participantAccessToken - 参加者のTwitch OAuthアクセストークン
 * @param adminAccessToken - スペース管理者（配信者）のTwitch OAuthアクセストークン
 * @param broadcasterId - チェック対象の配信者ID
 * @returns サブスクリプション状態
 */
export async function checkSubWithAdminToken(
  participantAccessToken: string,
  adminAccessToken: string,
  broadcasterId: string
): Promise<TwitchSubCheckResult> {
  try {
    if (!(participantAccessToken && adminAccessToken && broadcasterId)) {
      return {
        error: "Missing required parameters",
        isSubscribed: false,
      };
    }

    // 1. 参加者のTwitchユーザーIDを取得
    const participantIdResult = await getUserTwitchId(participantAccessToken);

    if (participantIdResult.error || !participantIdResult.userId) {
      return {
        error: participantIdResult.error || "Failed to get participant ID",
        isSubscribed: false,
      };
    }

    // 2. 管理者（配信者）のトークンでサブスクリプション状態をチェック
    const apiClient = await createApiClient(adminAccessToken);
    const subscription = await apiClient.subscriptions.checkUserSubscription(
      participantIdResult.userId,
      broadcasterId
    );

    return {
      isSubscribed: subscription !== null,
    };
  } catch (error) {
    // Twurple throws an error if not subscribed
    if (error instanceof Error && error.message.includes("404")) {
      return {
        isSubscribed: false,
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}
