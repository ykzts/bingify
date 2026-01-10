"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import {
  registerTwitchBroadcasterMetadata,
  registerYouTubeChannelMetadata,
} from "@/lib/data/social-metadata-helpers";
import { getOAuthToken } from "@/lib/oauth/token-storage";
import { updateSpaceFormSchema } from "@/lib/schemas/space";
import { systemFeaturesSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import type { SystemFeatures } from "@/lib/types/settings";
import type { SpaceAdmin } from "@/lib/types/space";
import { isValidUUID } from "@/lib/utils/uuid";
import { spaceSettingsFormOpts } from "../_lib/form-options";

// Email validation regex at top level for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UpdateSpaceState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success: boolean;
}

// Create the server validation function
// Note: We can't use the full schema with transform here due to type constraints,
// so we'll do manual validation in the action
const serverValidate = createServerValidate({
  ...spaceSettingsFormOpts,
  onServerValidate: () => {
    // Validation happens in the action itself due to schema transform complexity
    return undefined;
  },
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Update space requires comprehensive validation checks
export async function updateSpaceSettings(
  spaceId: string,
  _prevState: unknown,
  formData: FormData
) {
  try {
    if (!isValidUUID(spaceId)) {
      return {
        ...initialFormState,
        errors: ["Invalid space ID"],
      };
    }

    // Validate form data using TanStack Form server validation
    await serverValidate(formData);

    // Extract form data manually
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";
    const maxParticipantsRaw = formData.get("max_participants") as string;
    const maxParticipantsValue = Number.parseInt(maxParticipantsRaw, 10);
    const gatekeeperMode =
      (formData.get("gatekeeper_mode") as string) || "none";
    const socialPlatform =
      (formData.get("social_platform") as string) || "youtube";
    const youtubeRequirement =
      (formData.get("youtube_requirement") as string) || "none";
    const youtubeChannelId =
      (formData.get("youtube_channel_id") as string) || "";
    const twitchRequirement =
      (formData.get("twitch_requirement") as string) || "none";
    const twitchBroadcasterId =
      (formData.get("twitch_broadcaster_id") as string) || "";
    const emailAllowlistRaw = (formData.get("email_allowlist") as string) || "";
    const hideMetadataBeforeJoin = formData.has("hide_metadata_before_join");

    // Additional validation with the full schema for server-side checks
    const validation = updateSpaceFormSchema.safeParse({
      description,
      email_allowlist: emailAllowlistRaw,
      gatekeeper_mode: gatekeeperMode,
      max_participants: maxParticipantsValue,
      social_platform: socialPlatform,
      title,
      twitch_broadcaster_id: twitchBroadcasterId,
      twitch_requirement: twitchRequirement,
      youtube_channel_id: youtubeChannelId,
      youtube_requirement: youtubeRequirement,
    });

    if (!validation.success) {
      const errorMap: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        if (issue.path.length > 0) {
          errorMap[issue.path[0].toString()] = issue.message;
        }
      }
      return {
        ...initialFormState,
        errorMap,
        errors: [validation.error.issues[0].message],
      };
    }

    const { email_allowlist: emailAllowlist } = validation.data;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...initialFormState,
        errors: ["認証が必要です。ログインしてください。"],
      };
    }

    // Get current space data
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id, max_participants, settings, gatekeeper_rules, status")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        ...initialFormState,
        errors: ["スペースが見つかりませんでした"],
      };
    }

    // Check if space is closed
    if (space.status === "closed") {
      return {
        ...initialFormState,
        errors: ["errorClosedSpace"],
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
        ...initialFormState,
        errors: ["権限がありません"],
      };
    }

    // Check if gatekeeper settings are being changed
    // Helper function to check if gatekeeper rules are different
    const isGatekeeperRulesChanged = (
      currentRules: unknown,
      newMode: string,
      newSocialPlatform: string,
      newYoutubeRequirement: string,
      newYoutubeChannelId: string,
      newTwitchRequirement: string,
      newTwitchBroadcasterId: string,
      newEmailAllowlist: string[]
    ): boolean => {
      // Build the new gatekeeper rules structure
      let newRules: {
        email?: { allowed: string[] };
        twitch?: {
          broadcasterId: string;
          requirement: string;
        };
        youtube?: { channelId: string; requirement: string };
      } | null = null;

      if (newMode === "none") {
        newRules = null;
      } else if (newMode === "social") {
        newRules = {};
        if (
          newSocialPlatform === "youtube" &&
          newYoutubeRequirement !== "none" &&
          newYoutubeChannelId
        ) {
          newRules.youtube = {
            channelId: newYoutubeChannelId,
            requirement: newYoutubeRequirement,
          };
        } else if (
          newSocialPlatform === "twitch" &&
          newTwitchRequirement !== "none" &&
          newTwitchBroadcasterId
        ) {
          newRules.twitch = {
            broadcasterId: newTwitchBroadcasterId,
            requirement: newTwitchRequirement,
          };
        }
        if (Object.keys(newRules).length === 0) {
          newRules = null;
        }
      } else if (newMode === "email" && newEmailAllowlist.length > 0) {
        newRules = {
          email: {
            allowed: newEmailAllowlist,
          },
        };
      }

      // Compare current and new rules by JSON stringification
      return JSON.stringify(currentRules) !== JSON.stringify(newRules);
    };

    // Check if gatekeeper settings are being changed and restrict to owner
    if (
      !isOwner &&
      isGatekeeperRulesChanged(
        space.gatekeeper_rules,
        gatekeeperMode,
        socialPlatform,
        youtubeRequirement,
        youtubeChannelId,
        twitchRequirement,
        twitchBroadcasterId,
        emailAllowlist
      )
    ) {
      return {
        ...initialFormState,
        errors: ["errorGatekeeperOwnerOnly"],
      };
    }

    // Validation 1: Check system settings for max_participants_per_space and gatekeeper features
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("max_participants_per_space, features")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch system settings:", settingsError);
      return {
        ...initialFormState,
        errors: ["システム設定の取得に失敗しました"],
      };
    }

    if (
      systemSettings &&
      maxParticipantsValue > systemSettings.max_participants_per_space
    ) {
      return {
        ...initialFormState,
        errors: [
          `システムの上限設定（${systemSettings.max_participants_per_space}人）を超える値にはできません。`,
        ],
      };
    }

    // Validate and parse features field
    const featuresValidation = systemFeaturesSchema.safeParse(
      systemSettings?.features
    );
    const features: SystemFeatures | null = featuresValidation.success
      ? featuresValidation.data
      : null;

    // Validation 1.5: Check gatekeeper requirement types against system settings
    if (features?.gatekeeper && gatekeeperMode === "social") {
      const gatekeeper = features.gatekeeper;

      // Validate YouTube requirements
      if (socialPlatform === "youtube" && youtubeRequirement !== "none") {
        if (!gatekeeper.youtube?.enabled) {
          return {
            ...initialFormState,
            errors: ["errorYoutubeDisabled"],
          };
        }
        if (
          youtubeRequirement === "member" &&
          !gatekeeper.youtube?.member?.enabled
        ) {
          return {
            ...initialFormState,
            errors: ["errorYoutubeMemberDisabled"],
          };
        }
        if (
          youtubeRequirement === "subscriber" &&
          !gatekeeper.youtube?.subscriber?.enabled
        ) {
          return {
            ...initialFormState,
            errors: ["errorYoutubeSubscriberDisabled"],
          };
        }
      }

      // Validate Twitch requirements
      if (socialPlatform === "twitch" && twitchRequirement !== "none") {
        if (!gatekeeper.twitch?.enabled) {
          return {
            ...initialFormState,
            errors: ["errorTwitchDisabled"],
          };
        }
        if (
          twitchRequirement === "follower" &&
          !gatekeeper.twitch?.follower?.enabled
        ) {
          return {
            ...initialFormState,
            errors: ["errorTwitchFollowerDisabled"],
          };
        }
        if (
          twitchRequirement === "subscriber" &&
          !gatekeeper.twitch?.subscriber?.enabled
        ) {
          return {
            ...initialFormState,
            errors: ["errorTwitchSubscriberDisabled"],
          };
        }
      }
    }

    // Validate email mode
    if (
      gatekeeperMode === "email" &&
      features?.gatekeeper &&
      features.gatekeeper.email &&
      !features.gatekeeper.email.enabled
    ) {
      return {
        ...initialFormState,
        errors: ["errorEmailDisabled"],
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
        ...initialFormState,
        errors: ["参加者数の取得に失敗しました"],
      };
    }

    if (
      currentParticipantCount !== null &&
      maxParticipantsValue < currentParticipantCount
    ) {
      return {
        ...initialFormState,
        errors: [
          `現在の参加者数（${currentParticipantCount}人）より少ない人数には設定できません。`,
        ],
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
      if (socialPlatform === "youtube" && youtubeChannelId) {
        gatekeeperRules.youtube = {
          channelId: youtubeChannelId,
          requirement: youtubeRequirement,
        };
      } else if (socialPlatform === "twitch" && twitchBroadcasterId) {
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
        ...initialFormState,
        errors: ["設定の更新に失敗しました"],
      };
    }

    // Register social metadata after successful space update
    // YouTube metadata registration
    if (
      gatekeeperMode === "social" &&
      socialPlatform === "youtube" &&
      youtubeChannelId
    ) {
      // Get user's Google OAuth token for YouTube API calls
      const tokenResult = await getOAuthToken(supabase, "google");
      if (tokenResult.success && tokenResult.access_token) {
        // Register metadata (non-blocking - errors are logged but don't fail the update)
        const result = await registerYouTubeChannelMetadata(
          supabase,
          youtubeChannelId,
          tokenResult.access_token,
          user.id
        );
        if (!result.success) {
          console.error("Failed to register YouTube metadata:", result.error);
        }
      }
    }

    // Twitch metadata registration
    if (
      gatekeeperMode === "social" &&
      socialPlatform === "twitch" &&
      twitchBroadcasterId
    ) {
      // Get user's Twitch OAuth token
      const tokenResult = await getOAuthToken(supabase, "twitch");
      if (tokenResult.success && tokenResult.access_token) {
        // Register metadata (non-blocking - errors are logged but don't fail the update)
        const result = await registerTwitchBroadcasterMetadata(
          supabase,
          twitchBroadcasterId,
          tokenResult.access_token,
          user.id
        );
        if (!result.success) {
          console.error("Failed to register Twitch metadata:", result.error);
        }
      }
    }

    return {
      ...initialFormState,
      meta: { success: true },
      values: {
        description,
        email_allowlist: emailAllowlistRaw,
        gatekeeper_mode: gatekeeperMode as "none" | "social" | "email",
        hide_metadata_before_join: hideMetadataBeforeJoin,
        max_participants: maxParticipantsValue,
        social_platform: socialPlatform as "youtube" | "twitch",
        title,
        twitch_broadcaster_id: twitchBroadcasterId,
        twitch_requirement: twitchRequirement as
          | "none"
          | "follower"
          | "subscriber",
        youtube_channel_id: youtubeChannelId,
        youtube_requirement: youtubeRequirement as
          | "none"
          | "member"
          | "subscriber",
      },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error updating space settings:", e);
    return {
      ...initialFormState,
      errors: ["予期しないエラーが発生しました"],
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
  _formData: FormData
): Promise<PublishSpaceState> {
  try {
    // Validate UUID first before any operations
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

    // Check if space exists and user has permission (owner or admin)
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("owner_id, status")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    // Check if space is already published
    if (space.status !== "draft") {
      return {
        error: "このスペースは既に公開されています",
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

    // Update status to active
    const { error: publishError } = await supabase
      .from("spaces")
      .update({ status: "active" })
      .eq("id", spaceId)
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

export async function updateAndPublishSpace(
  spaceId: string,
  _prevState: PublishSpaceState,
  formData: FormData
): Promise<PublishSpaceState> {
  try {
    // First update the settings
    const updateResult = await updateSpaceSettings(
      spaceId,
      undefined,
      formData
    );

    // Check if update was successful (TanStack Form state has meta.success)
    const updateMeta = (updateResult as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    const hasErrors =
      Array.isArray((updateResult as Record<string, unknown>)?.errors) &&
      ((updateResult as Record<string, unknown>)?.errors as unknown[]).length >
        0;

    if (hasErrors || !updateMeta?.success) {
      const errors = (updateResult as Record<string, unknown>)?.errors as
        | string[]
        | undefined;
      return {
        error: errors?.[0] || "設定の更新に失敗しました",
        success: false,
      };
    }

    // Then publish
    return await publishSpace(spaceId, _prevState, formData);
  } catch (error) {
    console.error("Error updating and publishing space:", error);
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
      .select("owner_id, status")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    // Check if space is closed
    if (space.status === "closed") {
      return {
        error: "閉鎖されたスペースの設定は変更できません",
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
    const { error: insertError } = await supabase.from("space_roles").insert({
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
      .select("owner_id, status")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりませんでした",
        success: false,
      };
    }

    // Check if space is closed
    if (space.status === "closed") {
      return {
        error: "閉鎖されたスペースの設定は変更できません",
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

    // Get all admins with their profile info - split into two queries
    // Step 1: Get space_roles for this space
    const { data: roles, error: rolesError } = await supabase
      .from("space_roles")
      .select("user_id")
      .eq("space_id", spaceId)
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admins:", rolesError);
      return {
        admins: [],
        error: "管理者一覧の取得に失敗しました",
      };
    }

    // Step 2: Fetch profiles for the user_ids
    const userIds = (roles || []).map((role) => role.user_id);
    let profiles: Array<{
      avatar_url: string | null;
      email: string | null;
      full_name: string | null;
      id: string;
    }> = [];

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return {
          admins: [],
          error: "管理者情報の取得に失敗しました",
        };
      }

      profiles = profilesData || [];
    }

    // Transform the data - merge roles with profiles
    const admins: SpaceAdmin[] = (roles || []).map((role) => {
      const profile = profiles.find((p) => p.id === role.user_id);
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
