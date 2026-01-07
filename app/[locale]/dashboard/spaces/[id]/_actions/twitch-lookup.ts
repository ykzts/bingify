"use server";

import { lookupTwitchBroadcaster, type TwitchLookupResult } from "@/lib/twitch";

/**
 * Server Function to lookup Twitch broadcaster ID from username or URL
 * @param input - Twitch username, channel URL, or numeric ID
 * @returns Promise with broadcaster ID or error
 */
export async function lookupTwitchBroadcasterId(
  input: string
): Promise<TwitchLookupResult> {
  return await lookupTwitchBroadcaster(input);
}
