import { useQuery } from "@tanstack/react-query";
import { TWITCH_ID_REGEX } from "@/lib/twitch";
import { YOUTUBE_CHANNEL_ID_REGEX } from "@/lib/youtube-constants";
import type { Tables } from "@/types/supabase";
import {
  getTwitchMetadata,
  getYouTubeMetadata,
} from "../_actions/get-metadata";

/**
 * Fetch YouTube channel metadata using React Query
 * @param channelId - YouTube channel ID
 * @param enabled - Whether the query should run
 */
export function useYouTubeMetadata(channelId: string | null | undefined) {
  return useQuery({
    enabled:
      Boolean(channelId) && YOUTUBE_CHANNEL_ID_REGEX.test(channelId || ""),
    queryFn: async () => {
      if (!channelId) {
        return null;
      }

      const result = await getYouTubeMetadata(channelId);

      if (!(result.success && result.metadata)) {
        return null;
      }

      return result.metadata as Tables<"youtube_channels">;
    },
    queryKey: ["youtube-metadata", channelId],
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}

/**
 * Fetch Twitch broadcaster metadata using React Query
 * @param broadcasterId - Twitch broadcaster ID
 * @param enabled - Whether the query should run
 */
export function useTwitchMetadata(broadcasterId: string | null | undefined) {
  return useQuery({
    enabled:
      Boolean(broadcasterId) && TWITCH_ID_REGEX.test(broadcasterId || ""),
    queryFn: async () => {
      if (!broadcasterId) {
        return null;
      }

      const result = await getTwitchMetadata(broadcasterId);

      if (!(result.success && result.metadata)) {
        return null;
      }

      return result.metadata as Tables<"twitch_broadcasters">;
    },
    queryKey: ["twitch-metadata", broadcasterId],
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}
