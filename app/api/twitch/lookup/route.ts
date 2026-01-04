import { NextRequest, NextResponse } from "next/server";
import {
  type ParsedTwitchInput,
  getBroadcasterIdFromUsername,
  parseTwitchInput,
} from "@/lib/twitch";

/**
 * Get app access token for Twitch API
 * This uses client credentials flow
 */
async function getAppAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
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
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    // Parse the input to determine type
    const parsed: ParsedTwitchInput = parseTwitchInput(input);

    if (parsed.type === "invalid") {
      return NextResponse.json(
        {
          error:
            "Invalid input. Please enter a Twitch username, channel URL, or numeric ID.",
        },
        { status: 400 }
      );
    }

    // If it's already an ID, return it as-is
    if (parsed.type === "id") {
      return NextResponse.json({
        broadcasterId: parsed.value,
        source: "id",
      });
    }

    // It's a username, so look it up
    const appAccessToken = await getAppAccessToken();
    if (!appAccessToken) {
      return NextResponse.json(
        { error: "Failed to authenticate with Twitch API" },
        { status: 500 }
      );
    }

    const result = await getBroadcasterIdFromUsername(
      parsed.value,
      appAccessToken
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      broadcasterId: result.broadcasterId,
      source: "username",
      username: parsed.value,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
