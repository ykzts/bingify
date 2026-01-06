"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resolveYouTubeChannelId,
  type YouTubeChannelResolveResult,
} from "@/lib/youtube";

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

    // Get operator's YouTube OAuth token
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("provider_access_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    if (accountError) {
      return {
        error: "errorYoutubeNotLinked",
      };
    }

    if (!account?.provider_access_token) {
      return {
        error: "errorYoutubeNotLinked",
      };
    }

    // Use operator's OAuth token instead of API key
    // For OAuth, we need to make authenticated requests
    const result = await resolveYouTubeChannelId(
      input,
      account.provider_access_token
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

    // Get operator's Twitch OAuth token
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("provider_access_token")
      .eq("user_id", user.id)
      .eq("provider", "twitch")
      .maybeSingle();

    if (accountError) {
      return {
        error: "errorTwitchNotLinked",
      };
    }

    if (!account?.provider_access_token) {
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
    if (/^\d+$/.test(trimmedInput)) {
      return { broadcasterId: trimmedInput };
    }

    // Extract username from URL or use as-is
    let username = trimmedInput;
    if (trimmedInput.includes("twitch.tv/")) {
      const match = trimmedInput.match(/twitch\.tv\/([^/?#]+)/);
      if (match) {
        username = match[1];
      }
    }
    // Remove @ prefix if present
    username = username.replace(/^@/, "");

    // Call Twitch API with user's token
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          Authorization: `Bearer ${account.provider_access_token}`,
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
