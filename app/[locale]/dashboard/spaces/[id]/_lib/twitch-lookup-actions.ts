"use server";

import { ApiClient } from "@twurple/api";
import { StaticAuthProvider } from "@twurple/auth";
import { parseTwitchInput } from "@/lib/twitch";

export interface TwitchLookupResult {
  broadcasterId?: string;
  error?: string;
  source?: "id" | "username";
  username?: string;
}

/**
 * Get app access token for Twitch API using client credentials flow
 */
async function getAppAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!(clientId && clientSecret)) {
    return null;
  }

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      method: "POST",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to get Twitch app access token:", error);
    return null;
  }
}

/**
 * Server Function to lookup Twitch broadcaster ID from username or URL
 * @param input - Twitch username, channel URL, or numeric ID
 * @returns Promise with broadcaster ID or error
 */
export async function lookupTwitchBroadcasterId(
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

    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      return { error: "Twitch client ID not configured" };
    }

    // Use twurple to fetch user info
    const authProvider = new StaticAuthProvider(clientId, appAccessToken);
    const apiClient = new ApiClient({ authProvider });
    const users = await apiClient.users.getUsersByNames([parsed.value]);

    if (users.length === 0) {
      return { error: "User not found" };
    }

    return {
      broadcasterId: users[0].id,
      source: "username",
      username: parsed.value,
    };
  } catch (error) {
    console.error("Error in Twitch lookup:", error);
    return { error: "Internal server error" };
  }
}
