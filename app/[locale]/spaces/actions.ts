"use server";

import { checkEmailAllowed } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";
import { checkFollowStatus, checkSubStatus } from "@/lib/twitch";
import { isValidUUID } from "@/lib/utils/uuid";
import { checkSubscriptionStatus } from "@/lib/youtube";

export interface JoinSpaceState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export interface GatekeeperRules {
  email?: {
    allowed?: string[];
    blocked?: string[];
  };
  twitch?: {
    broadcasterId: string;
    requireFollow?: boolean;
    requireSub?: boolean;
  };
  youtube?: {
    channelId: string;
    requirement?: string; // "subscriber" or "member"
    required?: boolean; // Legacy format, for backward compatibility
  };
}

export interface SpaceInfo {
  gatekeeper_rules: GatekeeperRules | null;
  id: string;
  max_participants: number;
  owner_id: string | null;
  share_key: string;
  status: string | null;
}

export async function getSpaceById(spaceId: string): Promise<SpaceInfo | null> {
  try {
    if (!isValidUUID(spaceId)) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("spaces")
      .select(
        "id, share_key, status, owner_id, max_participants, gatekeeper_rules"
      )
      .eq("id", spaceId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (_error) {
    return null;
  }
}

async function verifyYouTubeSubscription(
  youtubeAccessToken: string | undefined,
  youtubeChannelId: string
): Promise<JoinSpaceState | null> {
  if (!youtubeAccessToken) {
    return {
      errorKey: "errorYouTubeVerificationRequired",
      success: false,
    };
  }

  const result = await checkSubscriptionStatus(
    youtubeAccessToken,
    youtubeChannelId
  );

  if (result.error) {
    return {
      errorKey: "errorYouTubeVerificationFailed",
      success: false,
    };
  }

  if (!result.isSubscribed) {
    return {
      errorKey: "errorYouTubeNotSubscribed",
      success: false,
    };
  }

  return null;
}

async function verifyTwitchRequirements(
  twitchAccessToken: string | undefined,
  twitchUserId: string | undefined,
  broadcasterId: string,
  requireFollow: boolean,
  requireSub: boolean
): Promise<JoinSpaceState | null> {
  if (!(twitchAccessToken && twitchUserId)) {
    return {
      errorKey: "errorTwitchVerificationRequired",
      success: false,
    };
  }

  // Check follow requirement
  if (requireFollow) {
    const followResult = await checkFollowStatus(
      twitchAccessToken,
      twitchUserId,
      broadcasterId
    );

    if (followResult.error) {
      return {
        errorKey: "errorTwitchVerificationFailed",
        success: false,
      };
    }

    if (!followResult.isFollowing) {
      return {
        errorKey: "errorTwitchNotFollowing",
        success: false,
      };
    }
  }

  // Check subscription requirement
  if (requireSub) {
    const subResult = await checkSubStatus(
      twitchAccessToken,
      twitchUserId,
      broadcasterId
    );

    if (subResult.error) {
      return {
        errorKey: "errorTwitchVerificationFailed",
        success: false,
      };
    }

    if (!subResult.isSubscribed) {
      return {
        errorKey: "errorTwitchNotSubscribed",
        success: false,
      };
    }
  }

  return null;
}

function verifyEmailAllowlist(
  userEmail: string,
  allowedPatterns: string[],
  blockedPatterns?: string[]
): JoinSpaceState | null {
  // Check blocked list first (if both allowed and blocked have same pattern, blocked takes priority)
  if (
    blockedPatterns &&
    blockedPatterns.length > 0 &&
    checkEmailAllowed(userEmail, blockedPatterns)
  ) {
    return {
      errorKey: "errorEmailBlocked",
      success: false,
    };
  }

  // Check allowed list
  if (!checkEmailAllowed(userEmail, allowedPatterns)) {
    return {
      errorKey: "errorEmailNotAllowed",
      success: false,
    };
  }

  return null;
}

async function verifyGatekeeperRules(
  gatekeeperRules: GatekeeperRules | null,
  userEmail: string,
  youtubeAccessToken: string | undefined,
  twitchAccessToken: string | undefined,
  twitchUserId: string | undefined
): Promise<JoinSpaceState | null> {
  // Check email allowlist if configured
  if (
    gatekeeperRules?.email?.allowed &&
    gatekeeperRules.email.allowed.length > 0
  ) {
    const verificationResult = verifyEmailAllowlist(
      userEmail,
      gatekeeperRules.email.allowed,
      gatekeeperRules.email.blocked
    );
    if (verificationResult) {
      return verificationResult;
    }
  }

  // Check YouTube subscription requirement if configured
  if (gatekeeperRules?.youtube?.channelId) {
    // Support both new format (requirement) and legacy format (required)
    const hasRequirement =
      gatekeeperRules.youtube.requirement === "subscriber" ||
      gatekeeperRules.youtube.requirement === "member" ||
      gatekeeperRules.youtube.required;

    if (hasRequirement) {
      const verificationResult = await verifyYouTubeSubscription(
        youtubeAccessToken,
        gatekeeperRules.youtube.channelId
      );
      if (verificationResult) {
        return verificationResult;
      }
    }
  }

  // Check Twitch requirements if configured
  if (
    gatekeeperRules?.twitch?.broadcasterId &&
    (gatekeeperRules.twitch.requireFollow || gatekeeperRules.twitch.requireSub)
  ) {
    const verificationResult = await verifyTwitchRequirements(
      twitchAccessToken,
      twitchUserId,
      gatekeeperRules.twitch.broadcasterId,
      Boolean(gatekeeperRules.twitch.requireFollow),
      Boolean(gatekeeperRules.twitch.requireSub)
    );
    if (verificationResult) {
      return verificationResult;
    }
  }

  return null;
}

export async function joinSpace(
  spaceId: string,
  youtubeAccessToken?: string,
  twitchAccessToken?: string,
  twitchUserId?: string
): Promise<JoinSpaceState> {
  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return {
        errorKey: "errorInvalidSpace",
        success: false,
      };
    }

    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    // Get user email for verification
    const userEmail = user.email;
    if (!userEmail) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    // Check if space exists and is active
    const { data: space } = await supabase
      .from("spaces")
      .select("id, status, gatekeeper_rules")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return {
        errorKey: "errorInvalidSpace",
        success: false,
      };
    }

    if (space.status !== "active") {
      return {
        errorKey: "errorSpaceClosed",
        success: false,
      };
    }

    // Verify gatekeeper requirements
    const gatekeeperRules = space.gatekeeper_rules as GatekeeperRules | null;
    const verificationResult = await verifyGatekeeperRules(
      gatekeeperRules,
      userEmail,
      youtubeAccessToken,
      twitchAccessToken,
      twitchUserId
    );
    if (verificationResult) {
      return verificationResult;
    }

    // Try to join the space - rely on unique constraint for duplicate prevention
    const { error } = await supabase.from("participants").insert({
      space_id: spaceId,
      user_id: user.id,
    });

    if (error) {
      // Check if it's a unique constraint violation (user already joined)
      if (error.code === "23505") {
        // User already joined, treat as success
        return {
          success: true,
        };
      }

      // Check if it's a quota error
      if (error.code === "P0001" || error.message.includes("limit reached")) {
        return {
          errorKey: "errorQuotaReached",
          success: false,
        };
      }

      console.error("Database error:", error);
      return {
        errorKey: "errorJoinFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error joining space:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}

export async function leaveSpace(spaceId: string): Promise<JoinSpaceState> {
  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return {
        errorKey: "errorInvalidSpace",
        success: false,
      };
    }

    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    // Remove user from participants
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("space_id", spaceId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        errorKey: "errorLeaveFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error leaving space:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}

export async function getParticipantCount(
  spaceId: string
): Promise<{ count: number; maxParticipants: number } | null> {
  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return null;
    }

    const supabase = await createClient();

    // Get participant count and max participants
    const { count, error: countError } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("space_id", spaceId);

    if (countError) {
      console.error("Error counting participants:", countError);
      return null;
    }

    const { data: space } = await supabase
      .from("spaces")
      .select("max_participants")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return null;
    }

    return {
      count: count || 0,
      maxParticipants: space.max_participants,
    };
  } catch (error) {
    console.error("Error getting participant count:", error);
    return null;
  }
}

export async function checkUserParticipation(
  spaceId: string
): Promise<boolean> {
  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return false;
    }

    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    // Check if user has already joined
    const { data } = await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    return !!data;
  } catch (_error) {
    return false;
  }
}
