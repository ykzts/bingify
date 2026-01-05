import { youtube_v3 } from "@googleapis/youtube";

// 正規表現をトップレベルに定義（パフォーマンス向上）
const YOUTUBE_CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;
const YOUTUBE_HANDLE_PATH_REGEX = /^\/@([^/]+)/;
const YOUTUBE_CHANNEL_PATH_REGEX = /^\/channel\/(UC[a-zA-Z0-9_-]{22})/;
const YOUTUBE_CUSTOM_PATH_REGEX = /^\/c\/([^/]+)/;
const YOUTUBE_USER_PATH_REGEX = /^\/user\/([^/]+)/;

// エクスポートして他のモジュールでも使用可能にする
export { YOUTUBE_CHANNEL_ID_REGEX };

export interface YouTubeSubscriptionCheckResult {
  error?: string;
  isSubscribed: boolean;
}

export interface YouTubeMembershipCheckResult {
  error?: string;
  isMember: boolean;
}

export interface YouTubeChannelResolveResult {
  channelId?: string;
  error?: string;
}

/**
 * YouTubeの入力値からチャンネルIDを抽出または解決する
 *
 * サポートする形式:
 * - チャンネルID: UCxxxxxxxxxxxxxxxxxxxxxx
 * - ハンドル: @username
 * - ハンドルURL: https://www.youtube.com/@username
 * - チャンネルURL: https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
 * - カスタムURL: https://www.youtube.com/c/CustomName
 * - レガシーユーザーURL: https://www.youtube.com/user/username
 *
 * @param input - ユーザーが入力した値
 * @returns チャンネルIDまたはnull（パース可能な場合）、それ以外はnull
 */
function parseYouTubeInput(input: string): {
  channelId?: string;
  handle?: string;
  username?: string;
} {
  const trimmedInput = input.trim();

  // 1. チャンネルIDの直接入力（UCで始まる24文字）
  if (YOUTUBE_CHANNEL_ID_REGEX.test(trimmedInput)) {
    return { channelId: trimmedInput };
  }

  // 2. ハンドル形式（@から始まる）
  if (trimmedInput.startsWith("@")) {
    return { handle: trimmedInput };
  }

  // 3. URL形式のパース
  try {
    const url = new URL(trimmedInput);
    if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
      const pathname = url.pathname;

      // ハンドル形式: /@username
      const handleMatch = pathname.match(YOUTUBE_HANDLE_PATH_REGEX);
      if (handleMatch) {
        return { handle: `@${handleMatch[1]}` };
      }

      // チャンネルID形式: /channel/UCxxxxxxxxxxxxxxxxxxxxxx
      const channelMatch = pathname.match(YOUTUBE_CHANNEL_PATH_REGEX);
      if (channelMatch) {
        return { channelId: channelMatch[1] };
      }

      // カスタムURL形式: /c/CustomName
      // Note: カスタムURLは内部的にハンドルとして解決を試みます
      const customMatch = pathname.match(YOUTUBE_CUSTOM_PATH_REGEX);
      if (customMatch) {
        return { handle: `@${customMatch[1]}` };
      }

      // レガシーユーザー形式: /user/username
      const userMatch = pathname.match(YOUTUBE_USER_PATH_REGEX);
      if (userMatch) {
        return { username: userMatch[1] };
      }
    }
  } catch {
    // URLのパースに失敗した場合は続行
  }

  // パースできなかった場合は空のオブジェクトを返す
  return {};
}

export async function checkSubscriptionStatus(
  userAccessToken: string,
  channelId: string
): Promise<YouTubeSubscriptionCheckResult> {
  try {
    if (!(userAccessToken && channelId)) {
      return {
        error: "Missing required parameters",
        isSubscribed: false,
      };
    }

    const youtube = new youtube_v3.Youtube({
      auth: userAccessToken,
    });

    const response = await youtube.subscriptions.list({
      forChannelId: channelId,
      mine: true,
      part: ["snippet"],
    });

    const isSubscribed = Boolean(
      response.data.items && response.data.items.length > 0
    );

    return {
      isSubscribed,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isSubscribed: false,
    };
  }
}

/**
 * ユーザーがYouTubeチャンネルのメンバーかどうかをチェックする
 *
 * 重要: YouTubeメンバーシップ検証は現在サポートされていません。
 *
 * YouTube Data API v3は、ユーザーが自分のメンバーシップステータスを
 * チェックするエンドポイントを提供していません。members.listエンドポイントは
 * チャンネルオーナーの認証情報を必要とし、通常のユーザートークンで呼び出すと
 * 403エラーを返します。
 *
 * YouTubeメンバーシップ検証を実装するには、以下の代替案を検討してください:
 * 1. チャンネルオーナーフロー: チャンネルオーナー自身のOAuth認証情報を通じて
 *    メンバーを検証し、検証トークンを保存する
 * 2. Webhook: メンバーシップステータス変更のためのYouTube webhookと統合
 * 3. 手動検証: 手動検証プロセスを実装
 *
 * @param userAccessToken - ユーザーのOAuthアクセストークン（必須、検証済み）
 * @param channelId - メンバーシップをチェックするチャンネルのID（必須、検証済み）
 * @returns この機能がサポートされていないことを示すPromise
 */
export function checkMembershipStatus(
  userAccessToken: string,
  channelId: string
): Promise<YouTubeMembershipCheckResult> {
  // 必須パラメータを検証
  if (!(userAccessToken && channelId)) {
    return Promise.resolve({
      error: "Missing required parameters",
      isMember: false,
    });
  }

  // この機能がサポートされていないことを示すエラーを返す
  // members.listエンドポイントはチャンネルオーナーの認証情報を必要とし、
  // 通常のユーザーアクセストークンで呼び出すと403エラーが発生する
  return Promise.resolve({
    error:
      "YouTube membership verification is not supported. The API requires channel owner credentials.",
    isMember: false,
  });
}

/**
 * YouTubeの入力値（ハンドル、URL、チャンネルID）からチャンネルIDを解決する
 *
 * サポートする入力形式:
 * - チャンネルID: UCxxxxxxxxxxxxxxxxxxxxxx
 * - ハンドル: @username
 * - ハンドルURL: https://www.youtube.com/@username
 * - チャンネルURL: https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
 * - カスタムURL: https://www.youtube.com/c/CustomName
 * - レガシーユーザーURL: https://www.youtube.com/user/username
 *
 * @param input - ユーザーが入力した値
 * @param apiKey - YouTube Data API v3のAPIキー（必須）
 * @returns チャンネルIDまたはエラー情報
 */
export async function resolveYouTubeChannelId(
  input: string,
  apiKey: string
): Promise<YouTubeChannelResolveResult> {
  try {
    // 入力値の検証
    if (!input?.trim()) {
      return {
        error: "Input is required",
      };
    }

    if (!apiKey?.trim()) {
      return {
        error: "YouTube API key is not configured",
      };
    }

    const parsed = parseYouTubeInput(input);

    // すでにチャンネルIDの場合はそのまま返す
    if (parsed.channelId) {
      return {
        channelId: parsed.channelId,
      };
    }

    // YouTube API クライアントを初期化
    const youtube = new youtube_v3.Youtube({
      auth: apiKey,
    });

    // ハンドルから解決
    if (parsed.handle) {
      return await resolveByHandle(youtube, parsed.handle);
    }

    // レガシーユーザー名から解決
    if (parsed.username) {
      return await resolveByUsername(youtube, parsed.username);
    }

    // パースできなかった場合
    return {
      error:
        "Invalid input format. Please provide a channel ID, handle (@username), or YouTube URL",
    };
  } catch (error) {
    // APIエラーの詳細を返す
    if (error instanceof Error) {
      return {
        error: `YouTube API error: ${error.message}`,
      };
    }
    return {
      error: "An unknown error occurred while resolving YouTube channel ID",
    };
  }
}

/**
 * ハンドルからチャンネルIDを解決する
 */
async function resolveByHandle(
  youtube: youtube_v3.Youtube,
  handle: string
): Promise<YouTubeChannelResolveResult> {
  const response = await youtube.channels.list({
    forHandle: handle,
    part: ["id"],
  });

  if (response.data.items && response.data.items.length > 0) {
    const channelId = response.data.items[0].id;
    if (channelId) {
      return { channelId };
    }
  }

  return {
    error: `Channel not found for handle '${handle}'`,
  };
}

/**
 * レガシーユーザー名からチャンネルIDを解決する
 */
async function resolveByUsername(
  youtube: youtube_v3.Youtube,
  username: string
): Promise<YouTubeChannelResolveResult> {
  const response = await youtube.channels.list({
    forUsername: username,
    part: ["id"],
  });

  if (response.data.items && response.data.items.length > 0) {
    const channelId = response.data.items[0].id;
    if (channelId) {
      return { channelId };
    }
  }

  return {
    error: `Channel not found for username '${username}'`,
  };
}
