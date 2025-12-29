"use server";

import { updateSpaceFormSchema } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

export interface UpdateSpaceState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Update space requires comprehensive validation checks
export async function updateSpaceSettings(
  spaceId: string,
  _prevState: UpdateSpaceState,
  formData: FormData
): Promise<UpdateSpaceState> {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: "Invalid space ID",
        success: false,
      };
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "認証が必要です。ログインしてください。",
        success: false,
      };
    }

    // Extract and parse form data
    const maxParticipantsRaw = formData.get("max_participants") as string;
    const maxParticipants = Number.parseInt(maxParticipantsRaw, 10);
    const hideMetadataBeforeJoin = formData.has("hide_metadata_before_join");

    // Validate form data
    const validation = updateSpaceFormSchema.safeParse({
      title: (formData.get("title") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      max_participants: Number.isNaN(maxParticipants)
        ? undefined
        : maxParticipants,
      youtube_requirement:
        (formData.get("youtube_requirement") as string) || "none",
      youtube_channel_id: (formData.get("youtube_channel_id") as string) || "",
      twitch_requirement:
        (formData.get("twitch_requirement") as string) || "none",
      twitch_broadcaster_id:
        (formData.get("twitch_broadcaster_id") as string) || "",
      email_allowlist: (formData.get("email_allowlist") as string) || "",
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        if (issue.path.length > 0) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      }
      return {
        error: validation.error.issues[0].message,
        fieldErrors,
        success: false,
      };
    }

    const {
      title,
      description,
      max_participants: maxParticipantsValue,
      youtube_requirement: youtubeRequirement,
      youtube_channel_id: youtubeChannelId,
      twitch_requirement: twitchRequirement,
      twitch_broadcaster_id: twitchBroadcasterId,
      email_allowlist: emailAllowlist,
    } = validation.data;

    // Get current space data
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id, max_participants, settings")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    // Check ownership
    if (space.owner_id !== user.id) {
      return {
        error: "権限がありません",
        success: false,
      };
    }

    // Validation 1: Check system settings for max_participants_per_space
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("max_participants_per_space")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch system settings:", settingsError);
      return {
        error: "システム設定の取得に失敗しました",
        success: false,
      };
    }

    if (
      systemSettings &&
      maxParticipantsValue > systemSettings.max_participants_per_space
    ) {
      return {
        error: `システムの上限設定（${systemSettings.max_participants_per_space}人）を超える値にはできません。`,
        success: false,
      };
    }

    // Validation 2: Check current participant count
    // Note: Using regular SELECT instead of HEAD to ensure RLS policy works correctly
    const { count: currentParticipantCount, error: countError } = await supabase
      .from("participants")
      .select("id", { count: "exact" })
      .eq("space_id", spaceId);

    if (countError) {
      console.error("Failed to count participants:", countError);
      return {
        error: "参加者数の取得に失敗しました",
        success: false,
      };
    }

    if (
      currentParticipantCount !== null &&
      maxParticipantsValue < currentParticipantCount
    ) {
      return {
        error: `現在の参加者数（${currentParticipantCount}人）より少ない人数には設定できません。`,
        success: false,
      };
    }

    // Build gatekeeper_rules
    let gatekeeperRules: {
      email?: { allowed: string[] };
      twitch?: {
        broadcasterId: string;
        requirement: string;
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
          requirement: twitchRequirement,
        };
      }

      if (hasEmailRule) {
        gatekeeperRules.email = {
          allowed: emailAllowlist,
        };
      }
    }

    // Update space
    const { error: updateError } = await supabase
      .from("spaces")
      .update({
        description: description || null,
        gatekeeper_rules: gatekeeperRules,
        max_participants: maxParticipantsValue,
        settings: {
          ...(space.settings as Record<string, unknown>),
          hide_metadata_before_join: hideMetadataBeforeJoin,
        },
        title: title || null,
      })
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (updateError) {
      console.error("Database error:", updateError);
      return {
        error: "設定の更新に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating space settings:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export interface PublishSpaceState {
  error?: string;
  success: boolean;
}

export async function publishSpace(
  spaceId: string,
  _prevState: PublishSpaceState,
  formData: FormData
): Promise<PublishSpaceState> {
  try {
    // Validate UUID first before any operations
    if (!isValidUUID(spaceId)) {
      return {
        error: "Invalid space ID",
        success: false,
      };
    }

    // First update the settings
    const updateResult = await updateSpaceSettings(
      spaceId,
      { success: false },
      formData
    );

    if (!updateResult.success) {
      return {
        error: updateResult.error || "設定の更新に失敗しました",
        success: false,
      };
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "認証が必要です。ログインしてください。",
        success: false,
      };
    }

    // Update status to active
    const { error: publishError } = await supabase
      .from("spaces")
      .update({ status: "active" })
      .eq("id", spaceId)
      .eq("owner_id", user.id)
      .eq("status", "draft"); // Only publish if currently draft

    if (publishError) {
      console.error("Database error:", publishError);
      return {
        error: "公開に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error publishing space:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}
