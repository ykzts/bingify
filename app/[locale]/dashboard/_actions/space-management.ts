"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateSecureToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { formatDateSuffix } from "@/lib/utils/date-format";

const MAX_SLUG_SUGGESTIONS = 10;

export interface CreateSpaceState {
  error?: string;
  errorData?: {
    max?: number;
  };
  shareKey?: string;
  spaceId?: string;
  success: boolean;
  suggestion?: string;
}

// Simple schema for initial space creation (share key only)
const simpleCreateSpaceSchema = z.object({
  shareKey: z
    .string()
    .min(3, "3文字以上入力してください")
    .max(30, "30文字以内で入力してください")
    .regex(/^[a-z0-9-]+$/, "小文字の英数字とハイフンのみ使用できます"),
});

export async function checkShareKeyAvailability(shareKey: string) {
  try {
    const dateSuffix = formatDateSuffix();
    const fullShareKey = `${shareKey}-${dateSuffix}`;

    const supabase = await createClient();
    const { data } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullShareKey)
      .single();

    return { available: !data };
  } catch (error) {
    console.error("Share key check error:", error);
    return { available: false };
  }
}

async function findAvailableShareKey(
  baseShareKey: string,
  dateSuffix: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  // Try suggestions with incrementing numbers
  for (let i = 2; i <= MAX_SLUG_SUGGESTIONS; i++) {
    const suggestion = `${baseShareKey}-${i}-${dateSuffix}`;
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Function handles multiple space creation checks including validation, authentication, role permissions, quota limits, and database operations
export async function createSpace(
  _prevState: CreateSpaceState,
  formData: FormData
): Promise<CreateSpaceState> {
  try {
    // Validate share key only
    const validation = simpleCreateSpaceSchema.safeParse({
      shareKey: formData.get("share_key") as string,
    });

    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

    const { shareKey } = validation.data;

    // Generate full share key with date suffix
    const dateSuffix = formatDateSuffix();
    const fullShareKey = `${shareKey}-${dateSuffix}`;

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

    // Check user role for space creation permission
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      return {
        error: "プロフィール情報の取得に失敗しました。",
        success: false,
      };
    }

    // Only admin and organizer can create spaces
    if (profile.role === "user") {
      return {
        error: "スペースを作成する権限がありません。",
        success: false,
      };
    }

    // Check system settings for max spaces per user and global limit
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("max_spaces_per_user, max_total_spaces")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch system settings:", settingsError);
      // Continue with space creation if settings fetch fails (graceful degradation)
    } else if (systemSettings) {
      // Check global space limit first (if not 0/unlimited)
      if (systemSettings.max_total_spaces > 0) {
        const { count: totalSpaceCount, error: totalCountError } =
          await supabase
            .from("spaces")
            .select("id", { count: "exact", head: true })
            .neq("status", "closed");

        if (totalCountError) {
          console.error("Failed to count total spaces:", totalCountError);
          return {
            error: "failedToCountSpaces",
            success: false,
          };
        }

        if (
          totalSpaceCount !== null &&
          totalSpaceCount >= systemSettings.max_total_spaces
        ) {
          return {
            error: "maxTotalSpacesReached",
            success: false,
          };
        }
      }

      // Count user's existing active spaces (excluding closed)
      // Note: The spaces table RLS policy does not have recursion issues,
      // so we can use count: "exact" directly. The participants table uses
      // a different approach (fetching rows then using array length) due to RLS recursion.
      const { count: userSpaceCount, error: countError } = await supabase
        .from("spaces")
        .select("id", { count: "exact" })
        .eq("owner_id", user.id)
        .neq("status", "closed");

      if (countError) {
        console.error("Failed to count user spaces:", countError);
        return {
          error: "failedToCountSpaces",
          success: false,
        };
      }

      if (
        userSpaceCount !== null &&
        userSpaceCount >= systemSettings.max_spaces_per_user
      ) {
        return {
          error: "maxSpacesReached",
          errorData: { max: systemSettings.max_spaces_per_user },
          success: false,
        };
      }
    }

    const { data: existing } = await supabase
      .from("spaces")
      .select("id")
      .eq("share_key", fullShareKey)
      .single();

    if (existing) {
      // Find an available suggestion
      const suggestion = await findAvailableShareKey(
        shareKey,
        dateSuffix,
        supabase
      );

      if (!suggestion) {
        return {
          error:
            "利用可能な共有キーが見つかりませんでした。別の名前をお試しください。",
          success: false,
        };
      }

      return {
        error: "この共有キーは既に使用されています",
        success: false,
        suggestion,
      };
    }

    // Create space in database with status: 'draft'
    const uuid = randomUUID();
    const viewToken = generateSecureToken();

    const { error } = await supabase
      .from("spaces")
      .insert({
        gatekeeper_rules: null,
        id: uuid,
        // max_participants will be set by trigger from system_settings
        max_participants: undefined as unknown as number,
        owner_id: user.id,
        settings: {},
        share_key: fullShareKey,
        status: "draft", // Start as draft
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
      shareKey: fullShareKey,
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
  created_at: string | null;
  id: string;
  is_owner?: boolean;
  participant_count?: number;
  share_key: string;
  status: string | null;
}

export interface UserSpacesResult {
  activeHostedSpaces: UserSpace[];
  activeParticipatedSpaces: UserSpace[];
  activeSpace: UserSpace | null;
  closedHostedSpaces: UserSpace[];
  closedParticipatedSpaces: UserSpace[];
  draftHostedSpaces: UserSpace[];
  error?: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Function handles multiple space sources and deduplication logic
export async function getUserSpaces(): Promise<UserSpacesResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        activeHostedSpaces: [],
        activeParticipatedSpaces: [],
        activeSpace: null,
        closedHostedSpaces: [],
        closedParticipatedSpaces: [],
        draftHostedSpaces: [],
        error: "Authentication required",
      };
    }

    // Fetch spaces where user is owner
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from("spaces")
      .select("id, share_key, status, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedError) {
      console.error("Error fetching owned spaces:", ownedError);
      return {
        activeHostedSpaces: [],
        activeParticipatedSpaces: [],
        activeSpace: null,
        closedHostedSpaces: [],
        closedParticipatedSpaces: [],
        draftHostedSpaces: [],
        error: "Failed to fetch spaces",
      };
    }

    // Fetch spaces where user is admin - split into two queries
    // Step 1: Get space_ids where user is admin
    const { data: adminRoles, error: adminError } = await supabase
      .from("space_roles")
      .select("space_id")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin roles:", adminError);
    }

    // Step 2: Fetch the actual space records
    const adminSpaceIds = (adminRoles || []).map((role) => role.space_id);
    let adminSpacesData: Array<{
      created_at: string | null;
      id: string;
      share_key: string;
      status: string | null;
    }> = [];

    if (adminSpaceIds.length > 0) {
      const { data: fetchedSpaces, error: spacesError } = await supabase
        .from("spaces")
        .select("id, share_key, status, created_at")
        .in("id", adminSpaceIds);

      if (spacesError) {
        console.error("Error fetching admin spaces:", spacesError);
      } else {
        adminSpacesData = fetchedSpaces || [];
      }
    }

    // Fetch spaces where user is participant - split into two queries
    // Step 1: Get space_ids where user is participant
    const { data: participantRoles, error: participantError } = await supabase
      .from("participants")
      .select("space_id")
      .eq("user_id", user.id);

    if (participantError) {
      console.error("Error fetching participant roles:", participantError);
    }

    // Step 2: Fetch the actual space records
    const participantSpaceIds = (participantRoles || []).map(
      (role) => role.space_id
    );
    let participantSpacesData: Array<{
      created_at: string | null;
      id: string;
      share_key: string;
      status: string | null;
    }> = [];

    if (participantSpaceIds.length > 0) {
      const { data: fetchedSpaces, error: spacesError } = await supabase
        .from("spaces")
        .select("id, share_key, status, created_at")
        .in("id", participantSpaceIds);

      if (spacesError) {
        console.error("Error fetching participant spaces:", spacesError);
      } else {
        participantSpacesData = fetchedSpaces || [];
      }
    }

    // Combine owned and admin spaces (hosted spaces)
    const ownedSpacesWithFlag: UserSpace[] = (ownedSpaces || []).map((s) => ({
      ...s,
      is_owner: true,
    }));

    const adminSpaces: UserSpace[] = adminSpacesData.map((space) => ({
      created_at: space.created_at,
      id: space.id,
      is_owner: false,
      share_key: space.share_key,
      status: space.status,
    }));

    // Combine and deduplicate hosted spaces (in case user is both owner and admin)
    const hostedSpaceMap = new Map<string, UserSpace>();
    for (const space of [...ownedSpacesWithFlag, ...adminSpaces]) {
      if (hostedSpaceMap.has(space.id)) {
        // If space exists, prefer owner flag
        const existing = hostedSpaceMap.get(space.id);
        if (existing && space.is_owner) {
          hostedSpaceMap.set(space.id, space);
        }
      } else {
        hostedSpaceMap.set(space.id, space);
      }
    }

    const hostedSpaces = Array.from(hostedSpaceMap.values()).sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    // Filter participated spaces to exclude hosted spaces (avoid duplicates)
    const hostedSpaceIds = new Set(hostedSpaces.map((s) => s.id));
    const participatedSpaces = participantSpacesData
      .filter((space) => !hostedSpaceIds.has(space.id))
      .map((space) => ({
        created_at: space.created_at,
        id: space.id,
        is_owner: false,
        share_key: space.share_key,
        status: space.status,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

    // Get participant counts for all spaces in a single query
    // Note: Fetching actual data instead of using count to avoid RLS recursion issues
    const allSpaceIds = [
      ...hostedSpaces.map((space) => space.id),
      ...participatedSpaces.map((space) => space.id),
    ];
    let participantCounts: Record<string, number> = {};

    if (allSpaceIds.length > 0) {
      const { data: participantsData } = await supabase
        .from("participants")
        .select("space_id")
        .in("space_id", allSpaceIds);

      // Count participants per space
      if (participantsData) {
        participantCounts = participantsData.reduce(
          (acc, participant) => {
            acc[participant.space_id] = (acc[participant.space_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      }
    }

    // Add participant counts to hosted spaces
    const hostedSpacesWithCounts = hostedSpaces.map((space) => ({
      ...space,
      participant_count: participantCounts[space.id] ?? 0,
    }));

    // Add participant counts to participated spaces
    const participatedSpacesWithCounts = participatedSpaces.map((space) => ({
      ...space,
      participant_count: participantCounts[space.id] ?? 0,
    }));

    // Filter spaces by status for hosted spaces
    const activeHostedSpaces = hostedSpacesWithCounts.filter(
      (s) => s.status === "active"
    );
    const draftHostedSpaces = hostedSpacesWithCounts.filter(
      (s) => s.status === "draft"
    );
    const closedHostedSpaces = hostedSpacesWithCounts.filter(
      (s) => s.status === "closed"
    );

    // Filter spaces by status for participated spaces
    const activeParticipatedSpaces = participatedSpacesWithCounts.filter(
      (s) => s.status === "active"
    );
    const closedParticipatedSpaces = participatedSpacesWithCounts.filter(
      (s) => s.status === "closed"
    );

    // Find active space (excluding draft) - only from hosted spaces
    let activeSpace: UserSpace | null = null;
    const activeSpaceData = activeHostedSpaces[0] ?? null;

    if (activeHostedSpaces.length > 1) {
      // Multiple active spaces found; using the most recently created (first in list)
      console.warn(
        `Multiple active spaces found for user ${user.id}; using the most recently created one.`
      );
    }

    if (activeSpaceData) {
      activeSpace = activeSpaceData;
    }

    return {
      activeHostedSpaces,
      activeParticipatedSpaces,
      activeSpace,
      closedHostedSpaces,
      closedParticipatedSpaces,
      draftHostedSpaces,
    };
  } catch (error) {
    console.error("Error in getUserSpaces:", error);
    return {
      activeHostedSpaces: [],
      activeParticipatedSpaces: [],
      activeSpace: null,
      closedHostedSpaces: [],
      closedParticipatedSpaces: [],
      draftHostedSpaces: [],
      error: "An unexpected error occurred",
    };
  }
}

export interface DeleteSpaceResult {
  error?: string;
  success: boolean;
}

export async function deleteSpace(spaceId: string): Promise<DeleteSpaceResult> {
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

    // Delete the space (RLS policy ensures only owner can delete)
    const { error } = await supabase
      .from("spaces")
      .delete()
      .eq("id", spaceId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to delete space",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting space:", error);
    return {
      error: "An unexpected error occurred",
      success: false,
    };
  }
}
