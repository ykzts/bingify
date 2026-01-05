"use server";

import {
  resolveYouTubeChannelId,
  type YouTubeChannelResolveResult,
} from "@/lib/youtube";

// エラーメッセージから値を抽出する正規表現
const ERROR_VALUE_REGEX = /'([^']+)'/;

/**
 * Server Function to resolve YouTube channel ID from handle, URL, or channel ID
 * @param input - YouTube handle (@username), channel URL, or channel ID
 * @returns Promise with channel ID or error
 */
export async function lookupYouTubeChannelId(
  input: string
): Promise<YouTubeChannelResolveResult> {
  // YouTube API キーを環境変数から取得
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      error: "YouTube API キーが設定されていません",
    };
  }

  const result = await resolveYouTubeChannelId(input, apiKey);

  // エラーメッセージを日本語に変換（UIで表示するため）
  if (result.error) {
    const errorTranslations: Record<string, string> = {
      "Input is required": "入力値が空です",
      "YouTube API key is not configured":
        "YouTube APIキーが設定されていません",
      "Invalid input format. Please provide a channel ID, handle (@username), or YouTube URL":
        "入力形式が不正です。チャンネルID、ハンドル（@username）、またはYouTube URLを入力してください",
    };

    // チャンネルが見つからない場合のエラーメッセージを変換
    if (result.error.startsWith("Channel not found for handle")) {
      const handle = result.error.match(ERROR_VALUE_REGEX)?.[1] || "";
      return {
        error: `ハンドル '${handle}' に対応するチャンネルが見つかりませんでした`,
      };
    }

    if (result.error.startsWith("Channel not found for username")) {
      const username = result.error.match(ERROR_VALUE_REGEX)?.[1] || "";
      return {
        error: `ユーザー名 '${username}' に対応するチャンネルが見つかりませんでした`,
      };
    }

    if (result.error.startsWith("YouTube API error:")) {
      return {
        error: `YouTube API エラー: ${result.error.replace("YouTube API error: ", "")}`,
      };
    }

    // 既知のエラーメッセージを変換、未知の場合はそのまま返す
    return {
      error: errorTranslations[result.error] || result.error,
    };
  }

  return result;
}
