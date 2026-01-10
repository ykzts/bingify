"use server";

import { getTwitchBroadcasterMetadata } from "@/lib/data/twitch-metadata";
import { getYouTubeChannelMetadata } from "@/lib/data/youtube-metadata";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

export interface MetadataResult {
  error?: string;
  metadata?: Tables<"youtube_channels"> | Tables<"twitch_broadcasters">;
  success: boolean;
}

/**
 * Get YouTube channel metadata from database
 * @param channelId - YouTube channel ID
 * @returns Metadata or null if not found/error
 */
export async function getYouTubeMetadata(
  channelId: string
): Promise<MetadataResult> {
  try {
    if (!channelId || channelId.trim() === "") {
      return {
        error: "Channel ID is required",
        success: false,
      };
    }

    const supabase = await createClient();
    const metadata = await getYouTubeChannelMetadata(supabase, channelId);

    if (!metadata) {
      return {
        error: "Metadata not found",
        success: false,
      };
    }

    return {
      metadata,
      success: true,
    };
  } catch (error) {
    console.error("Error getting YouTube metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/**
 * Get Twitch broadcaster metadata from database
 * @param broadcasterId - Twitch broadcaster ID
 * @returns Metadata or null if not found/error
 */
export async function getTwitchMetadata(
  broadcasterId: string
): Promise<MetadataResult> {
  try {
    if (!broadcasterId || broadcasterId.trim() === "") {
      return {
        error: "Broadcaster ID is required",
        success: false,
      };
    }

    const supabase = await createClient();
    const metadata = await getTwitchBroadcasterMetadata(
      supabase,
      broadcasterId
    );

    if (!metadata) {
      return {
        error: "Metadata not found",
        success: false,
      };
    }

    return {
      metadata,
      success: true,
    };
  } catch (error) {
    console.error("Error getting Twitch metadata:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}
