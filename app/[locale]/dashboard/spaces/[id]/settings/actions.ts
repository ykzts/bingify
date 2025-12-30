"use server";

import { updateSpaceFormSchema } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

// Email validation regex at top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      description: (formData.get("description") as string) || undefined,
      email_allowlist: (formData.get("email_allowlist") as string) || "",
      gatekeeper_mode: (formData.get("gatekeeper_mode") as string) || "none",
      max_participants: Number.isNaN(maxParticipants)
        ? undefined
        : maxParticipants,
      social_platform: (formData.get("social_platform") as string) || undefined,
      title: (formData.get("title") as string) || undefined,
      twitch_broadcaster_id:
        (formData.get("twitch_broadcaster_id") as string) || "",
      twitch_requirement:
        (formData.get("twitch_requirement") as string) || "none",
      youtube_channel_id: (formData.get("youtube_channel_id") as string) || "",
      youtube_requirement:
        (formData.get("youtube_requirement") as string) || "none",
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
      description,
      email_allowlist: emailAllowlist,
      gatekeeper_mode: gatekeeperMode,
      max_participants: maxParticipantsValue,
      social_platform: socialPlatform,
      title,
      twitch_broadcaster_id: twitchBroadcasterId,
      twitch_requirement: twitchRequirement,
      youtube_channel_id: youtubeChannelId,
      youtube_requirement: youtubeRequirement,
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

    // Check if user is owner or admin
    const isOwner = space.owner_id === user.id;
    const { data: adminRole } = await supabase
      .from("space_roles")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    const isAdmin = !!adminRole;

    if (!(isOwner || isAdmin)) {
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
    // Note: Fetching actual data instead of using count to avoid RLS recursion issues
    const { data: participantsData, error: countError } = await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceId);

    const currentParticipantCount = participantsData?.length ?? 0;

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

    // Build exclusive gatekeeper_rules based on selected mode
    let gatekeeperRules: {
      email?: { allowed: string[] };
      twitch?: {
        broadcasterId: string;
        requirement: string;
      };
      youtube?: { channelId: string; requirement: string };
    } | null = null;

    if (gatekeeperMode === "none") {
      // No restrictions
      gatekeeperRules = null;
    } else if (gatekeeperMode === "social") {
      gatekeeperRules = {};

      // Only add the selected platform's rules
      if (
        socialPlatform === "youtube" &&
        youtubeRequirement !== "none" &&
        youtubeChannelId
      ) {
        gatekeeperRules.youtube = {
          channelId: youtubeChannelId,
          requirement: youtubeRequirement,
        };
      } else if (
        socialPlatform === "twitch" &&
        twitchRequirement !== "none" &&
        twitchBroadcasterId
      ) {
        gatekeeperRules.twitch = {
          broadcasterId: twitchBroadcasterId,
          requirement: twitchRequirement,
        };
      }

      // If no valid social rules, set to null
      if (Object.keys(gatekeeperRules).length === 0) {
        gatekeeperRules = null;
      }
    } else if (gatekeeperMode === "email" && emailAllowlist.length > 0) {
      // Email restrictions
      gatekeeperRules = {
        email: {
          allowed: emailAllowlist,
        },
      };
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
      .eq("id", spaceId);
    // Note: RLS policy handles both owner and admin access, no need to check owner_id here

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

// Admin management actions

export interface InviteAdminState {
  error?: string;
  success: boolean;
}

export async function inviteAdmin(
  spaceId: string,
  _prevState: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        error: "無効なスペースIDです",
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

    const email = (formData.get("email") as string)?.trim().toLowerCase();

    if (!email) {
      return {
        error: "メールアドレスを入力してください",
        success: false,
      };
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return {
        error: "有効なメールアドレスを入力してください",
        success: false,
      };
    }

    // Check if current user is the owner
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    if (space.owner_id !== user.id) {
      return {
        error: "オーナーのみが管理者を招待できます",
        success: false,
      };
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !targetUser) {
      return {
        error: "このメールアドレスのユーザーが見つかりませんでした",
        success: false,
      };
    }

    // Check if user is already the owner
    if (targetUser.id === space.owner_id) {
      return {
        error: "オーナーは管理者として追加できません",
        success: false,
      };
    }

    // Check if user is already an admin
    const { data: existingRole } = await supabase
      .from("space_roles")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", targetUser.id)
      .single();

    if (existingRole) {
      return {
        error: "このユーザーは既に管理者です",
        success: false,
      };
    }

    // Add user as admin
    const { error: insertError } = await supabase
      .from("space_roles")
      .insert({
        role: "admin",
        space_id: spaceId,
        user_id: targetUser.id,
      });

    if (insertError) {
      console.error("Database error:", insertError);
      return {
        error: "管理者の追加に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error inviting admin:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export interface RemoveAdminState {
  error?: string;
  success: boolean;
}

export async function removeAdmin(
  spaceId: string,
  adminUserId: string
): Promise<RemoveAdminState> {
  try {
    if (!(isValidUUID(spaceId) && isValidUUID(adminUserId))) {
      return {
        error: "無効なIDです",
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

    // Check if current user is the owner
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    if (space.owner_id !== user.id) {
      return {
        error: "オーナーのみが管理者を削除できます",
        success: false,
      };
    }

    // Prevent removing the owner (should not happen, but safety check)
    if (adminUserId === space.owner_id) {
      return {
        error: "オーナーは削除できません",
        success: false,
      };
    }

    // Remove admin role
    const { error: deleteError } = await supabase
      .from("space_roles")
      .delete()
      .eq("space_id", spaceId)
      .eq("user_id", adminUserId);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return {
        error: "管理者の削除に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing admin:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export interface SpaceAdmin {
  avatar_url: string | null;
  email: string | null;
  full_name: string | null;
  user_id: string;
}

export interface GetSpaceAdminsResult {
  admins: SpaceAdmin[];
  error?: string;
}

export async function getSpaceAdmins(
  spaceId: string
): Promise<GetSpaceAdminsResult> {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        admins: [],
        error: "無効なスペースIDです",
      };
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        admins: [],
        error: "認証が必要です",
      };
    }

    // Verify user is owner
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        admins: [],
        error: "スペースが見つかりませんでした",
      };
    }

    if (space.owner_id !== user.id) {
      return {
        admins: [],
        error: "権限がありません",
      };
    }

    // Get all admins with their profile info
    const { data: roles, error: rolesError } = await supabase
      .from("space_roles")
      .select(
        `
        user_id,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq("space_id", spaceId)
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admins:", rolesError);
      return {
        admins: [],
        error: "管理者一覧の取得に失敗しました",
      };
    }

    // Transform the data
    type ProfileData = {
      avatar_url: string | null;
      email: string | null;
      full_name: string | null;
    };

    type RoleWithProfile = {
      profiles: ProfileData | ProfileData[] | null;
      user_id: string;
    };

    const admins: SpaceAdmin[] = (roles || []).map((role: RoleWithProfile) => {
      const profile = Array.isArray(role.profiles)
        ? role.profiles[0]
        : role.profiles;
      return {
        avatar_url: profile?.avatar_url || null,
        email: profile?.email || null,
        full_name: profile?.full_name || null,
        user_id: role.user_id,
      };
    });

    return {
      admins,
    };
  } catch (error) {
    console.error("Error in getSpaceAdmins:", error);
    return {
      admins: [],
      error: "予期しないエラーが発生しました",
    };
  }
}
