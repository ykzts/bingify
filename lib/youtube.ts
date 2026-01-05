import { youtube_v3 } from "@googleapis/youtube";

export interface YouTubeSubscriptionCheckResult {
  error?: string;
  isSubscribed: boolean;
}

export interface YouTubeMembershipCheckResult {
  error?: string;
  isMember: boolean;
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
