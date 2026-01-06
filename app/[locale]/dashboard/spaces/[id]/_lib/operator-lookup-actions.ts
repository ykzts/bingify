"use server";

import { getOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";
import {
  resolveYouTubeChannelId,
  type YouTubeChannelResolveResult,
} from "@/lib/youtube";

// Regex patterns for Twitch username parsing (defined at top level for performance)
const TWITCH_NUMERIC_ID_REGEX = /^\d+$/;
const TWITCH_URL_REGEX = /twitch\.tv\/([^/?#]+)/;
const TWITCH_AT_PREFIX_REGEX = /^@/;

/**
 * Server Function to resolve YouTube channel ID using operator's OAuth token
 * @param input - YouTube handle (@username), channel URL, or channel ID
 * @returns Promise with channel ID or error
 */
export async function lookupYouTubeChannelIdWithOperatorToken(
  input: string
): Promise<YouTubeChannelResolveResult> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "errorAuthRequired",
      };
    }

    // Get operator's YouTube OAuth token using the proper token storage function
    const tokenResult = await getOAuthToken(supabase, "google");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: "errorYoutubeNotLinked",
      };
    }

    // Use operator's OAuth token instead of API key
    // For OAuth, we need to make authenticated requests
    const result = await resolveYouTubeChannelId(
      input,
      tokenResult.access_token
    );

    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Server Function to lookup Twitch broadcaster ID using operator's OAuth token
 * @param input - Twitch username, channel URL, or numeric ID
 * @returns Promise with broadcaster ID or error
 */
export async function lookupTwitchBroadcasterIdWithOperatorToken(
  input: string
): Promise<{ broadcasterId?: string; error?: string }> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "errorAuthRequired",
      };
    }

    // Get operator's Twitch OAuth token using the proper token storage function
    const tokenResult = await getOAuthToken(supabase, "twitch");

    if (!(tokenResult.success && tokenResult.access_token)) {
      return {
        error: "errorTwitchNotLinked",
      };
    }

    // For Twitch, we need to implement user-token-based lookup
    // Currently lookupTwitchBroadcaster uses client credentials
    // We need to use the user's token instead

    // Parse the input to determine what we're looking up
    const trimmedInput = input.trim();

    // If it's already a numeric ID, return it
    if (TWITCH_NUMERIC_ID_REGEX.test(trimmedInput)) {
      return { broadcasterId: trimmedInput };
    }

    // Extract username from URL or use as-is
    let username = trimmedInput;
    if (trimmedInput.includes("twitch.tv/")) {
      const match = trimmedInput.match(TWITCH_URL_REGEX);
      if (match) {
        username = match[1];
      }
    }
    // Remove @ prefix if present
    username = username.replace(TWITCH_AT_PREFIX_REGEX, "");

    // Call Twitch API with user's token
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.access_token}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID || "",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { error: "errorTwitchTokenExpired" };
      }
      return { error: "errorTwitchApiError" };
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return { error: "errorTwitchUserNotFound" };
    }

    return { broadcasterId: data.data[0].id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
