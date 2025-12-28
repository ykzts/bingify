"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { generateSecureToken } from "@/lib/crypto";
import {
  emailAllowlistSchema,
  maxParticipantsSchema,
  spaceSchema,
  twitchBroadcasterIdSchema,
  twitchRequirementSchema,
  youtubeChannelIdSchema,
  youtubeRequirementSchema,
} from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";

const MAX_SLUG_SUGGESTIONS = 10;

export interface CreateSpaceState {
  success: boolean;
  error?: string;
  spaceId?: string;
  shareKey?: string;
  suggestion?: string;
}

export async function checkSlugAvailability(slug: string) {
  try {
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullSlug = `${slug}-${dateSuffix}`;

    const supabase = await createClient();
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullSlug)
      .single();

    return { available: !data };
  } catch (error) {
    console.error("Slug check error:", error);
    return { available: false };
  }
}

async function findAvailableSlug(
  baseSlug: string,
  dateSuffix: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  // Try suggestions with incrementing numbers
  for (let i = 2; i <= MAX_SLUG_SUGGESTIONS; i++) {
    const suggestion = `${baseSlug}-${i}-${dateSuffix}`;
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", suggestion)
      .single();

    if (!data) {
      return suggestion;
    }
  }

  // If no suggestion found within max attempts, return null
  return null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form validation and space creation require multiple checks
export async function createSpace(
  _prevState: CreateSpaceState,
  formData: FormData
): Promise<CreateSpaceState> {
  try {
    const shareKey = formData.get("share_key") as string;
    const maxParticipantsRaw = formData.get("max_participants") as string;
    const youtubeChannelIdRaw =
      (formData.get("youtube_channel_id") as string) || "";
    const youtubeRequirementRaw =
      (formData.get("youtube_requirement") as string) || "none";
    const twitchBroadcasterIdRaw =
      (formData.get("twitch_broadcaster_id") as string) || "";
    const twitchRequirementRaw =
      (formData.get("twitch_requirement") as string) || "none";
    const emailAllowlistRaw = (formData.get("email_allowlist") as string) || "";

    // Validate input with Zod
    const validation = spaceSchema.safeParse({ slug: shareKey });
    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

    // Validate max participants
    const maxParticipants = Number(maxParticipantsRaw);
    const maxParticipantsValidation =
      maxParticipantsSchema.safeParse(maxParticipants);
    if (!maxParticipantsValidation.success) {
      return {
        error: maxParticipantsValidation.error.issues[0].message,
        success: false,
      };
    }

    // Validate YouTube requirement
    const youtubeRequirementValidation = youtubeRequirementSchema.safeParse(
      youtubeRequirementRaw
    );
    if (!youtubeRequirementValidation.success) {
      return {
        error: youtubeRequirementValidation.error.issues[0].message,
        success: false,
      };
    }
    const youtubeRequirement = youtubeRequirementValidation.data;

    // Validate YouTube Channel ID if requirement is not "none"
    let youtubeChannelId: string | undefined;
    if (youtubeRequirement !== "none") {
      if (!youtubeChannelIdRaw.trim()) {
        return {
          error: "YouTube要件を設定する場合、チャンネルIDが必要です",
          success: false,
        };
      }
      const channelIdValidation =
        youtubeChannelIdSchema.safeParse(youtubeChannelIdRaw);
      if (!channelIdValidation.success) {
        return {
          error: channelIdValidation.error.issues[0].message,
          success: false,
        };
      }
      youtubeChannelId = channelIdValidation.data;
    }

    // Validate Twitch requirement
    const twitchRequirementValidation =
      twitchRequirementSchema.safeParse(twitchRequirementRaw);
    if (!twitchRequirementValidation.success) {
      return {
        error: twitchRequirementValidation.error.issues[0].message,
        success: false,
      };
    }
    const twitchRequirement = twitchRequirementValidation.data;

    // Validate Twitch Broadcaster ID if requirement is not "none"
    let twitchBroadcasterId: string | undefined;
    if (twitchRequirement !== "none") {
      if (!twitchBroadcasterIdRaw.trim()) {
        return {
          error: "Twitch要件を設定する場合、配信者IDが必要です",
          success: false,
        };
      }
      const broadcasterIdValidation = twitchBroadcasterIdSchema.safeParse(
        twitchBroadcasterIdRaw
      );
      if (!broadcasterIdValidation.success) {
        return {
          error: broadcasterIdValidation.error.issues[0].message,
          success: false,
        };
      }
      twitchBroadcasterId = broadcasterIdValidation.data;
    }

    // Validate email allowlist if provided
    let emailAllowlist: string[] = [];
    if (emailAllowlistRaw.trim()) {
      const emailValidation = emailAllowlistSchema.safeParse(emailAllowlistRaw);
      if (!emailValidation.success) {
        return {
          error: emailValidation.error.issues[0].message,
          success: false,
        };
      }
      emailAllowlist = emailValidation.data;
    }

    // Generate full slug with date suffix
    const dateSuffix = format(new Date(), "yyyyMMdd");
    const fullSlug = `${shareKey}-${dateSuffix}`;

    // Check availability
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "認証が必要です。ログインしてください。",
        success: false,
      };
    }

    const { data: existing } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullSlug)
      .single();

    if (existing) {
      // Find an available suggestion
      const suggestion = await findAvailableSlug(
        shareKey,
        dateSuffix,
        supabase
      );

      if (!suggestion) {
        return {
          error:
            "利用可能なスラグが見つかりませんでした。別の名前をお試しください。",
          success: false,
        };
      }

      return {
        error: "このスラグは既に使用されています",
        success: false,
        suggestion,
      };
    }

    // Create space in database
    const uuid = randomUUID();
    const viewToken = generateSecureToken();

    // Build gatekeeper_rules
    let gatekeeperRules: {
      email?: { allowed: string[] };
      twitch?: {
        broadcasterId: string;
        requireFollow?: boolean;
        requireSub?: boolean;
      };
      youtube?: { channelId: string; requirement: string };
    } | null = null;

    const hasYouTubeRule = youtubeRequirement !== "none" && youtubeChannelId;
    const hasTwitchRule = twitchRequirement !== "none" && twitchBroadcasterId;
    const hasEmailRule = emailAllowlist.length > 0;

    if (hasYouTubeRule || hasTwitchRule || hasEmailRule) {
      gatekeeperRules = {};

      if (hasYouTubeRule) {
        gatekeeperRules.youtube = {
          channelId: youtubeChannelId as string,
          requirement: youtubeRequirement,
        };
      }

      if (hasTwitchRule) {
        gatekeeperRules.twitch = {
          broadcasterId: twitchBroadcasterId as string,
          requireFollow: twitchRequirement === "follower",
          requireSub: twitchRequirement === "subscriber",
        };
      }

      if (hasEmailRule) {
        gatekeeperRules.email = {
          allowed: emailAllowlist,
        };
      }
    }

    const { error } = await supabase
      .from("spaces")
      .insert({
        gatekeeper_rules: gatekeeperRules,
        id: uuid,
        max_participants: maxParticipantsValidation.data,
        owner_id: user.id,
        settings: {},
        share_key: fullSlug,
        status: "active",
        view_token: viewToken,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to create space",
        success: false,
      };
    }

    return {
      shareKey: fullSlug,
      spaceId: uuid,
      success: true,
    };
  } catch (error) {
    console.error("Error creating space:", error);
    return {
      error: "An unexpected error occurred",
      success: false,
    };
  }
}

export interface RegenerateViewTokenState {
  error?: string;
  success: boolean;
  viewToken?: string;
}

export async function regenerateViewToken(
  spaceId: string
): Promise<RegenerateViewTokenState> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Authentication required",
        success: false,
      };
    }

    // Generate new token
    const newToken = generateSecureToken();

    // Update the space with new token
    // RLS policy ensures only the owner can update
    const { error, count } = await supabase
      .from("spaces")
      .update({ view_token: newToken })
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to regenerate token",
        success: false,
      };
    }

    // Check if any row was updated (user must be owner)
    if (count === 0) {
      return {
        error: "Space not found or access denied",
        success: false,
      };
    }

    return {
      success: true,
      viewToken: newToken,
    };
  } catch (error) {
    console.error("Error regenerating token:", error);
    return {
      error: "An unexpected error occurred",
      success: false,
    };
  }
}

export interface UserSpace {
  created_at: string;
  id: string;
  participant_count?: number;
  share_key: string;
  status: string;
}

export interface UserSpacesResult {
  activeSpace: UserSpace | null;
  error?: string;
  spaces: UserSpace[];
}

export async function getUserSpaces(): Promise<UserSpacesResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        activeSpace: null,
        error: "Authentication required",
        spaces: [],
      };
    }

    // Fetch user's spaces ordered by creation date
    const { data: spaces, error } = await supabase
      .from("spaces")
      .select("id, share_key, status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching spaces:", error);
      return {
        activeSpace: null,
        error: "Failed to fetch spaces",
        spaces: [],
      };
    }

    // Find active space
    let activeSpace: UserSpace | null = null;
    const allActiveSpaces = (spaces ?? []).filter((s) => s.status === "active");
    const activeSpaceData = allActiveSpaces[0] ?? null;

    if (allActiveSpaces.length > 1) {
      // Multiple active spaces found; using the most recently created (first in list)
      console.warn(
        `Multiple active spaces found for user ${user.id}; using the most recently created one.`
      );
    }

    if (activeSpaceData) {
      // Get participant count
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("space_id", activeSpaceData.id);

      activeSpace = {
        ...activeSpaceData,
        participant_count: count || 0,
      };
    }

    return {
      activeSpace,
      spaces: spaces || [],
    };
  } catch (error) {
    console.error("Error in getUserSpaces:", error);
    return {
      activeSpace: null,
      error: "An unexpected error occurred",
      spaces: [],
    };
  }
}
