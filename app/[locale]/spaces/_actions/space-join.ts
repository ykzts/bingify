"use server";

import { getTranslations } from "next-intl/server";
import {
  getOAuthToken,
  isTokenExpired,
  type OAuthProvider,
} from "@/lib/oauth/token-storage";
import { checkEmailAllowed } from "@/lib/schemas/space";
import { createClient } from "@/lib/supabase/server";
import {
  type GatekeeperRules,
  gatekeeperRulesSchema,
  type PublicSpaceInfo,
} from "@/lib/types/space";
import { isValidUserName } from "@/lib/utils/user";
import { isValidUUID } from "@/lib/utils/uuid";

export interface JoinSpaceState {
  error?: string;
  success: boolean;
}

export interface OAuthTokenAvailability {
  available: boolean;
  error?: string;
}

export interface SpaceInfo {
  gatekeeper_rules: GatekeeperRules | null;
  id: string;
  max_participants: number;
  owner_id: string | null;
  share_key: string;
  status: string | null;
}

/**
 * 指定されたプロバイダーの有効なOAuthトークンが存在するかチェックする
 *
 * @param provider - OAuth プロバイダー ('google' または 'twitch')
 * @returns トークンが利用可能かどうか
 */
export async function checkOAuthTokenAvailability(
  provider: OAuthProvider
): Promise<OAuthTokenAvailability> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        available: false,
        error: "User not authenticated",
      };
    }

    // トークンを取得
    const tokenResult = await getOAuthToken(supabase, provider);

    if (!tokenResult.success) {
      return {
        available: false,
        error: tokenResult.error,
      };
    }

    // トークンが存在しない場合
    if (!tokenResult.access_token) {
      return {
        available: false,
      };
    }

    // トークンの有効期限をチェック
    if (isTokenExpired(tokenResult.expires_at)) {
      return {
        available: false,
        error: "Token expired",
      };
    }

    return {
      available: true,
    };
  } catch (error) {
    console.error("Error checking OAuth token availability:", error);
    return {
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * ユーザーの名前が設定されているかチェックする
 *
 * @returns 名前が設定されているかどうか
 */
export async function checkUserNameSet(): Promise<{
  hasName: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // ユーザー認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "User not authenticated",
        hasName: false,
      };
    }

    // プロフィールから full_name を取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return {
        error: "Failed to fetch profile",
        hasName: false,
      };
    }

    // full_name が有効かチェック
    const hasName = isValidUserName(profile?.full_name);

    return {
      hasName,
    };
  } catch (error) {
    console.error("Error checking user name:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      hasName: false,
    };
  }
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

    // Validate gatekeeper_rules using Zod schema
    const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
      data.gatekeeper_rules
    );

    return {
      gatekeeper_rules: gatekeeperValidation.success
        ? gatekeeperValidation.data
        : null,
      id: data.id,
      max_participants: data.max_participants,
      owner_id: data.owner_id,
      share_key: data.share_key,
      status: data.status,
    };
  } catch (_error) {
    return null;
  }
}

async function verifyYouTubeSubscription(
  youtubeChannelId: string,
  requirement: "subscriber" | "member",
  spaceOwnerId: string
): Promise<JoinSpaceState | null> {
  const t = await getTranslations("UserSpace");
  const supabase = await createClient();

  // 1. 参加者のトークンを取得
  const participantTokenResult = await getOAuthToken(supabase, "google");

  if (
    !(participantTokenResult.success && participantTokenResult.access_token)
  ) {
    return {
      error: t("errorYouTubeVerificationRequired"),
      success: false,
    };
  }

  const participantAccessToken = participantTokenResult.access_token;

  // 2. スペース所有者のトークンを取得
  const { getOAuthTokenForUser } = await import("@/lib/oauth/token-storage");
  const ownerTokenResult = await getOAuthTokenForUser(spaceOwnerId, "google");

  if (!(ownerTokenResult.success && ownerTokenResult.access_token)) {
    return {
      error: t("errorYouTubeVerificationFailed"),
      success: false,
    };
  }

  const ownerAccessToken = ownerTokenResult.access_token;

  // Check membership if required
  if (requirement === "member") {
    const { checkMembershipWithAdminToken } = await import("@/lib/youtube");
    const result = await checkMembershipWithAdminToken(
      participantAccessToken,
      ownerAccessToken,
      youtubeChannelId
    );

    if (result.error) {
      return {
        error: t("errorYouTubeVerificationFailed"),
        success: false,
      };
    }

    if (!result.isMember) {
      return {
        error: t("errorYouTubeNotMember"),
        success: false,
      };
    }

    return null;
  }

  // Check subscription
  const { checkSubscriptionWithAdminToken } = await import("@/lib/youtube");
  const result = await checkSubscriptionWithAdminToken(
    participantAccessToken,
    ownerAccessToken,
    youtubeChannelId
  );

  if (result.error) {
    return {
      error: t("errorYouTubeVerificationFailed"),
      success: false,
    };
  }

  if (!result.isSubscribed) {
    return {
      error: t("errorYouTubeNotSubscribed"),
      success: false,
    };
  }

  return null;
}

async function verifyTwitchRequirements(
  broadcasterId: string,
  requirement: "follower" | "subscriber",
  spaceOwnerId: string
): Promise<JoinSpaceState | null> {
  const t = await getTranslations("UserSpace");
  const supabase = await createClient();

  // 1. 参加者のトークンを取得
  const participantTokenResult = await getOAuthToken(supabase, "twitch");

  if (
    !(participantTokenResult.success && participantTokenResult.access_token)
  ) {
    return {
      error: t("errorTwitchVerificationRequired"),
      success: false,
    };
  }

  const participantAccessToken = participantTokenResult.access_token;

  // 2. スペース所有者のトークンを取得
  const { getOAuthTokenForUser } = await import("@/lib/oauth/token-storage");
  const ownerTokenResult = await getOAuthTokenForUser(spaceOwnerId, "twitch");

  if (!(ownerTokenResult.success && ownerTokenResult.access_token)) {
    return {
      error: t("errorTwitchVerificationFailed"),
      success: false,
    };
  }

  const ownerAccessToken = ownerTokenResult.access_token;

  // Check follow requirement
  if (requirement === "follower" || requirement === "subscriber") {
    const { checkFollowWithAdminToken } = await import("@/lib/twitch");
    const followResult = await checkFollowWithAdminToken(
      participantAccessToken,
      ownerAccessToken,
      broadcasterId
    );

    if (followResult.error) {
      return {
        error: t("errorTwitchVerificationFailed"),
        success: false,
      };
    }

    if (!followResult.isFollowing) {
      return {
        error: t("errorTwitchNotFollowing"),
        success: false,
      };
    }
  }

  // Check subscription requirement
  if (requirement === "subscriber") {
    const { checkSubWithAdminToken } = await import("@/lib/twitch");
    const subResult = await checkSubWithAdminToken(
      participantAccessToken,
      ownerAccessToken,
      broadcasterId
    );

    if (subResult.error) {
      return {
        error: t("errorTwitchVerificationFailed"),
        success: false,
      };
    }

    if (!subResult.isSubscribed) {
      return {
        error: t("errorTwitchNotSubscribed"),
        success: false,
      };
    }
  }

  return null;
}

async function verifyEmailAllowlist(
  userEmail: string,
  allowedPatterns: string[],
  blockedPatterns?: string[]
): Promise<JoinSpaceState | null> {
  const t = await getTranslations("UserSpace");

  // Check blocked list first (if both allowed and blocked have same pattern, blocked takes priority)
  if (
    blockedPatterns &&
    blockedPatterns.length > 0 &&
    checkEmailAllowed(userEmail, blockedPatterns)
  ) {
    return {
      error: t("errorEmailBlocked"),
      success: false,
    };
  }

  // Check allowed list
  if (!checkEmailAllowed(userEmail, allowedPatterns)) {
    return {
      error: t("errorEmailNotAllowed"),
      success: false,
    };
  }

  return null;
}

async function verifyGatekeeperRules(
  gatekeeperRules: GatekeeperRules | null,
  userEmail: string,
  spaceOwnerId: string
): Promise<JoinSpaceState | null> {
  // Check email allowlist if configured
  if (
    gatekeeperRules?.email?.allowed &&
    gatekeeperRules.email.allowed.length > 0
  ) {
    const verificationResult = await verifyEmailAllowlist(
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
    const requirement = gatekeeperRules.youtube.requirement;

    if (requirement === "subscriber" || requirement === "member") {
      const verificationResult = await verifyYouTubeSubscription(
        gatekeeperRules.youtube.channelId,
        requirement,
        spaceOwnerId
      );
      if (verificationResult) {
        return verificationResult;
      }
    }
  }

  // Check Twitch requirements if configured
  if (gatekeeperRules?.twitch?.broadcasterId) {
    const requirement = gatekeeperRules.twitch.requirement;

    if (requirement === "follower" || requirement === "subscriber") {
      const verificationResult = await verifyTwitchRequirements(
        gatekeeperRules.twitch.broadcasterId,
        requirement,
        spaceOwnerId
      );
      if (verificationResult) {
        return verificationResult;
      }
    }
  }

  return null;
}

/**
 * ユーザーの認証状態と名前設定を検証する
 */
async function validateUserForJoin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<{ user: { id: string; email: string } } | JoinSpaceState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: t("errorUnauthorized"),
      success: false,
    };
  }

  const userEmail = user.email;
  if (!userEmail) {
    return {
      error: t("errorUnauthorized"),
      success: false,
    };
  }

  // Check if user has set their full_name
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile in joinSpace:", profileError);
    return {
      error: t("errorGeneric"),
      success: false,
    };
  }

  if (!isValidUserName(profile?.full_name)) {
    return {
      error: t("errorNameRequired"),
      success: false,
    };
  }

  return { user: { email: userEmail, id: user.id } };
}

/**
 * スペースの状態と有効期限を検証する
 */
async function validateSpaceStatus(
  space: { status: string | null; created_at: string | null; id: string },
  supabase: Awaited<ReturnType<typeof createClient>>,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<JoinSpaceState | null> {
  if (space.status !== "active") {
    return {
      error: t("errorSpaceClosed"),
      success: false,
    };
  }

  // Check if space has expired based on system settings
  const { data: systemSettings } = await supabase
    .from("system_settings")
    .select("space_expiration_hours")
    .eq("id", 1)
    .single();

  if (systemSettings && systemSettings.space_expiration_hours > 0) {
    if (!space.created_at) {
      console.error("Space created_at is null:", space.id);
      return {
        error: t("errorInvalidSpace"),
        success: false,
      };
    }

    const createdAt = new Date(space.created_at);
    const expirationDate = new Date(
      createdAt.getTime() +
        systemSettings.space_expiration_hours * 60 * 60 * 1000
    );
    if (new Date() > expirationDate) {
      return {
        error: t("errorSpaceClosed"),
        success: false,
      };
    }
  }

  return null;
}

/**
 * 参加者の挿入エラーを処理する
 */
function handleParticipantInsertError(
  error: { code?: string; message?: string },
  t: Awaited<ReturnType<typeof getTranslations>>
): JoinSpaceState {
  // Check if it's a unique constraint violation (user already joined)
  if (error.code === "23505") {
    return {
      success: true,
    };
  }

  // Check if it's a quota error
  if (error.code === "P0001" || error.message?.includes("limit reached")) {
    return {
      error: t("errorQuotaReached"),
      success: false,
    };
  }

  console.error("Database error:", error);
  return {
    error: t("errorJoinFailed"),
    success: false,
  };
}

export async function joinSpace(spaceId: string): Promise<JoinSpaceState> {
  const t = await getTranslations("UserSpace");

  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return {
        error: t("errorInvalidSpace"),
        success: false,
      };
    }

    const supabase = await createClient();

    // Validate user authentication and name
    const userValidation = await validateUserForJoin(supabase, t);
    if ("success" in userValidation) {
      return userValidation;
    }
    const { user } = userValidation;

    // Check if space exists and is active (and not expired)
    const { data: space } = await supabase
      .from("spaces")
      .select("id, status, gatekeeper_rules, created_at, owner_id")
      .eq("id", spaceId)
      .single();

    if (!space) {
      return {
        error: t("errorInvalidSpace"),
        success: false,
      };
    }

    // Validate space owner exists
    if (!space.owner_id) {
      console.error("Space owner_id is null:", space.id);
      return {
        error: t("errorInvalidSpace"),
        success: false,
      };
    }

    // Validate space status and expiration
    const statusValidation = await validateSpaceStatus(space, supabase, t);
    if (statusValidation) {
      return statusValidation;
    }

    // Verify gatekeeper requirements
    const gatekeeperRules = space.gatekeeper_rules as GatekeeperRules | null;
    const verificationResult = await verifyGatekeeperRules(
      gatekeeperRules,
      user.email,
      space.owner_id
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
      return handleParticipantInsertError(error, t);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error joining space:", error);
    return {
      error: t("errorGeneric"),
      success: false,
    };
  }
}

export async function leaveSpace(spaceId: string): Promise<JoinSpaceState> {
  const t = await getTranslations("UserSpace");

  try {
    // Validate UUID format
    if (!isValidUUID(spaceId)) {
      return {
        error: t("errorInvalidSpace"),
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
        error: t("errorUnauthorized"),
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
        error: t("errorLeaveFailed"),
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error leaving space:", error);
    return {
      error: t("errorGeneric"),
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
    // Note: Fetching actual data instead of using count to avoid RLS recursion issues
    const { data: participantsData, error: countError } = await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceId);

    const count = participantsData?.length ?? 0;

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

/**
 * Helper to mask YouTube gatekeeper rules
 */
async function maskYoutubeRules(gatekeeperRules: GatekeeperRules): Promise<
  | {
      channel_title: string | null;
      channelId: string;
      handle: string | null;
      requirement: string;
      thumbnail_url: string | null;
    }
  | undefined
> {
  if (!gatekeeperRules?.youtube?.channelId) {
    return undefined;
  }

  const requirement = gatekeeperRules.youtube.requirement;

  if (!requirement || requirement === "none") {
    return undefined;
  }

  // Fetch YouTube channel metadata
  const supabase = await createClient();
  const { getYouTubeChannelMetadata } = await import(
    "@/lib/data/youtube-metadata"
  );
  const metadata = await getYouTubeChannelMetadata(
    supabase,
    gatekeeperRules.youtube.channelId
  );

  return {
    channel_title: metadata?.channel_title || null,
    channelId: gatekeeperRules.youtube.channelId,
    handle: metadata?.handle || null,
    requirement,
    thumbnail_url: metadata?.thumbnail_url || null,
  };
}

/**
 * Helper to mask Twitch gatekeeper rules
 */
async function maskTwitchRules(gatekeeperRules: GatekeeperRules): Promise<
  | {
      broadcasterId: string;
      display_name: string | null;
      profile_image_url: string | null;
      requirement: string;
      username: string | null;
    }
  | undefined
> {
  if (!gatekeeperRules?.twitch?.broadcasterId) {
    return undefined;
  }

  const requirement = gatekeeperRules.twitch.requirement;

  if (!requirement || requirement === "none") {
    return undefined;
  }

  // Fetch Twitch broadcaster metadata
  const supabase = await createClient();
  const { getTwitchBroadcasterMetadata } = await import(
    "@/lib/data/twitch-metadata"
  );
  const metadata = await getTwitchBroadcasterMetadata(
    supabase,
    gatekeeperRules.twitch.broadcasterId
  );

  return {
    broadcasterId: gatekeeperRules.twitch.broadcasterId,
    display_name: metadata?.display_name || null,
    profile_image_url: metadata?.profile_image_url || null,
    requirement,
    username: metadata?.username || null,
  };
}

/**
 * Helper to mask email gatekeeper rules
 */
async function maskEmailRules(
  gatekeeperRules: GatekeeperRules
): Promise<{ allowed: string[] } | undefined> {
  if (
    !gatekeeperRules?.email?.allowed ||
    gatekeeperRules.email.allowed.length === 0
  ) {
    return undefined;
  }

  const { maskEmailPatterns } = await import("@/lib/privacy");
  return {
    allowed: maskEmailPatterns(gatekeeperRules.email.allowed),
  };
}

/**
 * Get public information about a space for non-participants
 * This function masks sensitive data like email addresses
 */
export async function getSpacePublicInfo(
  spaceId: string
): Promise<PublicSpaceInfo | null> {
  try {
    if (!isValidUUID(spaceId)) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("spaces")
      .select(
        "id, share_key, status, title, description, gatekeeper_rules, settings"
      )
      .eq("id", spaceId)
      .single();

    if (error || !data) {
      return null;
    }

    // Validate and parse settings using Zod schema
    const { spaceSettingsSchema } = await import("@/lib/types/space");
    const settingsValidation = spaceSettingsSchema.safeParse(data.settings);
    const hideMetadata =
      settingsValidation.success &&
      settingsValidation.data?.hide_metadata_before_join === true;

    // Validate gatekeeper_rules using Zod schema
    const gatekeeperValidation = gatekeeperRulesSchema.safeParse(
      data.gatekeeper_rules
    );
    const gatekeeperRules = gatekeeperValidation.success
      ? gatekeeperValidation.data
      : null;

    let maskedGatekeeperRules: PublicSpaceInfo["gatekeeper_rules"] = null;

    if (gatekeeperRules) {
      maskedGatekeeperRules = {};

      // Mask email allowlist
      const maskedEmail = await maskEmailRules(gatekeeperRules);
      if (maskedEmail) {
        maskedGatekeeperRules.email = maskedEmail;
      }

      // Include YouTube requirement with metadata
      const maskedYoutube = await maskYoutubeRules(gatekeeperRules);
      if (maskedYoutube) {
        maskedGatekeeperRules.youtube = maskedYoutube;
      }

      // Include Twitch requirement with metadata
      const maskedTwitch = await maskTwitchRules(gatekeeperRules);
      if (maskedTwitch) {
        maskedGatekeeperRules.twitch = maskedTwitch;
      }

      // If no rules were actually added, normalize back to null
      if (Object.keys(maskedGatekeeperRules).length === 0) {
        maskedGatekeeperRules = null;
      }
    }

    return {
      description: data.description,
      gatekeeper_rules: maskedGatekeeperRules,
      hideMetadata,
      id: data.id,
      share_key: data.share_key,
      status: data.status,
      title: data.title,
    };
  } catch (_error) {
    return null;
  }
}
