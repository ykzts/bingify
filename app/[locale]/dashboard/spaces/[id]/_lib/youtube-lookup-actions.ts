"use server";

import {
  resolveYouTubeChannelId,
  type YouTubeChannelResolveResult,
} from "@/lib/youtube";

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

  return await resolveYouTubeChannelId(input, apiKey);
}
