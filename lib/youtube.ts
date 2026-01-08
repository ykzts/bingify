import { youtube_v3 } from "@googleapis/youtube";
import { OAuth2Client } from "google-auth-library";
import { YOUTUBE_CHANNEL_ID_REGEX } from "./youtube-constants";

// 正規表現をトップレベルに定義（パフォーマンス向上）
const YOUTUBE_HANDLE_PATH_REGEX = /^\/@([^/]+)/;
const YOUTUBE_CHANNEL_PATH_REGEX = /^\/channel\/(UC[a-zA-Z0-9_-]{22})/;
const YOUTUBE_CUSTOM_PATH_REGEX = /^\/c\/([^/]+)/;
const YOUTUBE_USER_PATH_REGEX = /^\/user\/([^/]+)/;

/**
 * OAuthアクセストークンからOAuth2Clientを作成する
 *
 * YouTube Data APIでOAuth認証を使用する場合、アクセストークン文字列を直接渡すのではなく、
 * OAuth2Clientオブジェクトを作成して認証情報を設定する必要があります。
 *
 * @param accessToken - OAuthアクセストークン
 * @returns 設定済みのOAuth2Clientインスタンス
 */
function createOAuth2ClientFromToken(accessToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });
  return oauth2Client;
}

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

export interface YouTubeUserChannelResult {
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

/**
 * エラーからYouTubeのエラーコードを取得するヘルパー関数
 */
function getYouTubeErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "ERROR_YOUTUBE_UNKNOWN";
  }

  // 構造化されたステータスコードチェック
  const errorObj = error as {
    status?: number;
    response?: { status?: number };
    code?: number;
  };
  const status = errorObj.status || errorObj.response?.status || errorObj.code;

  if (status === 401) {
    return "ERROR_YOUTUBE_TOKEN_EXPIRED";
  }
  if (status === 403) {
    return "ERROR_YOUTUBE_INSUFFICIENT_PERMISSIONS";
  }

  // フォールバック: メッセージベースのチェック
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("invalid credentials")
    ) {
      return "ERROR_YOUTUBE_TOKEN_EXPIRED";
    }
    if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
      return "ERROR_YOUTUBE_INSUFFICIENT_PERMISSIONS";
    }
    return error.message;
  }

  return "ERROR_YOUTUBE_UNKNOWN";
}

/**
 * 参加者のYouTubeチャンネルIDを取得する
 * 参加者自身のアクセストークンを使用してチャンネルIDを取得
 *
 * @param userAccessToken - 参加者のYouTube OAuthアクセストークン
 * @returns チャンネルID or エラー
 */
export async function getUserYouTubeChannelId(
  userAccessToken: string
): Promise<YouTubeUserChannelResult> {
  try {
    if (!userAccessToken) {
      return {
        error: "Missing access token",
      };
    }

    // OAuth2Clientを作成してアクセストークンを設定
    const oauth2Client = createOAuth2ClientFromToken(userAccessToken);

    const youtube = new youtube_v3.Youtube({
      auth: oauth2Client,
    });

    // 自分のチャンネル情報を取得
    const response = await youtube.channels.list({
      mine: true,
      part: ["id"],
    });

    if (response.data.items && response.data.items.length > 0) {
      const channelId = response.data.items[0].id;
      if (channelId) {
        return { channelId };
      }
    }

    return {
      error: "No channel found for this user",
    };
  } catch (error) {
    const errorCode = getYouTubeErrorCode(error);
    return {
      error: errorCode,
    };
  }
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

    // OAuth2Clientを作成してアクセストークンを設定
    const oauth2Client = createOAuth2ClientFromToken(userAccessToken);

    const youtube = new youtube_v3.Youtube({
      auth: oauth2Client,
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
    const errorCode = getYouTubeErrorCode(error);
    return {
      error: errorCode,
      isSubscribed: false,
    };
  }
}

/**
 * 参加者がYouTubeチャンネルのサブスクライバーかチェックする（管理者トークン使用）
 *
 * 検証フロー:
 * 1. 参加者のトークンで参加者のチャンネルIDを取得
 * 2. 管理者のトークンで参加者が対象チャンネルをサブスクライブしているかチェック
 *
 * @param participantAccessToken - 参加者のYouTube OAuthアクセストークン
 * @param adminAccessToken - スペース管理者のYouTube OAuthアクセストークン
 * @param targetChannelId - サブスクリプションをチェックする対象チャンネルID
 * @returns サブスクリプション状態
 */
export async function checkSubscriptionWithAdminToken(
  participantAccessToken: string,
  adminAccessToken: string,
  targetChannelId: string
): Promise<YouTubeSubscriptionCheckResult> {
  try {
    if (!(participantAccessToken && adminAccessToken && targetChannelId)) {
      return {
        error: "Missing required parameters",
        isSubscribed: false,
      };
    }

    // 1. 参加者のチャンネルIDを取得
    const participantChannelResult = await getUserYouTubeChannelId(
      participantAccessToken
    );

    if (participantChannelResult.error || !participantChannelResult.channelId) {
      return {
        error:
          participantChannelResult.error || "Failed to get participant channel",
        isSubscribed: false,
      };
    }

    // 2. 管理者のトークンで参加者がサブスクライブしているかチェック
    // Note: このAPIは参加者自身のトークンでチェックする必要がある
    // 管理者トークンでは他のユーザーのサブスクリプション状態を確認できない
    return await checkSubscriptionStatus(
      participantAccessToken,
      targetChannelId
    );
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
 * 参加者がYouTubeチャンネルのメンバーかチェックする（管理者トークン使用）
 *
 * 検証フロー:
 * 1. 参加者のトークンで参加者のチャンネルIDを取得
 * 2. 管理者のトークン（チャンネル所有者）でメンバーリストから参加者を検索
 *
 * @param participantAccessToken - 参加者のYouTube OAuthアクセストークン
 * @param adminAccessToken - スペース管理者（チャンネル所有者）のYouTube OAuthアクセストークン
 * @param targetChannelId - メンバーシップをチェックする対象チャンネルID
 * @returns メンバーシップ状態
 */
export async function checkMembershipWithAdminToken(
  participantAccessToken: string,
  adminAccessToken: string,
  targetChannelId: string
): Promise<YouTubeMembershipCheckResult> {
  try {
    if (!(participantAccessToken && adminAccessToken && targetChannelId)) {
      return {
        error: "Missing required parameters",
        isMember: false,
      };
    }

    // 1. 参加者のチャンネルIDを取得
    const participantChannelResult = await getUserYouTubeChannelId(
      participantAccessToken
    );

    if (participantChannelResult.error || !participantChannelResult.channelId) {
      return {
        error:
          participantChannelResult.error || "Failed to get participant channel",
        isMember: false,
      };
    }

    const participantChannelId = participantChannelResult.channelId;

    // 2. 管理者（チャンネル所有者）のトークンでメンバーリストを取得
    // OAuth2Clientを作成してアクセストークンを設定
    const oauth2Client = createOAuth2ClientFromToken(adminAccessToken);

    const youtube = new youtube_v3.Youtube({
      auth: oauth2Client,
    });

    // members.list APIを使用してメンバーを検索
    // このAPIはチャンネル所有者の権限が必要
    // ページネーションを処理して全メンバーを確認
    let pageToken: string | undefined;
    let isMember = false;

    do {
      const response = await youtube.members.list({
        pageToken,
        part: ["snippet"],
      });

      // 現在のページでメンバーを検索
      if (response.data.items) {
        isMember = response.data.items.some(
          (item) =>
            item.snippet?.memberDetails?.channelId === participantChannelId
        );

        // メンバーが見つかったら早期終了
        if (isMember) {
          break;
        }
      }

      // 次のページトークンを取得
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return {
      isMember,
    };
  } catch (error) {
    // 403エラーの場合は権限不足
    if (
      error instanceof Error &&
      (error.message.includes("403") || error.message.includes("insufficient"))
    ) {
      return {
        error: "Channel owner credentials required for membership verification",
        isMember: false,
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error",
      isMember: false,
    };
  }
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
 * @param auth - YouTube Data API v3のAPIキーまたはOAuthアクセストークン（必須）
 * @returns チャンネルIDまたはエラー情報
 */
export async function resolveYouTubeChannelId(
  input: string,
  auth: string
): Promise<YouTubeChannelResolveResult> {
  try {
    // 入力値の検証
    if (!input?.trim()) {
      return {
        error: "Input is required",
      };
    }

    if (!auth?.trim()) {
      return {
        error: "YouTube API key or OAuth token is not provided",
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
    // auth には API key または OAuth access token を渡すことができる
    // OAuth2 access tokenの場合はOAuth2Clientを作成する
    let authClient: string | OAuth2Client = auth;

    // OAuth2トークンの可能性がある場合（"ya29."で始まるなど）はOAuth2Clientを作成
    // ただし、APIキーとの区別が難しいため、まずは文字列として渡して試す
    // エラーが発生した場合にOAuth2Clientを試すアプローチは複雑になるため、
    // より確実な方法として、常にOAuth2Clientを作成する
    // APIキーの場合はOAuth2Clientが適切に処理する
    if (auth.startsWith("ya29.") || auth.length > 100) {
      // OAuth2アクセストークンの可能性が高い（ya29.で始まる、または長い文字列）
      authClient = createOAuth2ClientFromToken(auth);
    }

    const youtube = new youtube_v3.Youtube({
      auth: authClient,
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
