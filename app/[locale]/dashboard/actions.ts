"use server";

import { randomUUID } from "node:crypto";
import { format } from "date-fns";
import { cacheTag, revalidateTag } from "next/cache";
import { z } from "zod";
import { generateSecureToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";

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
    const dateSuffix = format(new Date(), "yyyyMMdd");
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
    const dateSuffix = format(new Date(), "yyyyMMdd");
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

    // Check system settings for max spaces per user
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("max_spaces_per_user")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch system settings:", settingsError);
      // Continue with space creation if settings fetch fails (graceful degradation)
    } else if (systemSettings) {
      // Count user's existing spaces
      // Note: The spaces table RLS policy does not have recursion issues,
      // so we can use count: "exact" directly. The participants table uses
      // a different approach (fetching rows then using array length) due to RLS recursion.
      const { count: userSpaceCount, error: countError } = await supabase
        .from("spaces")
        .select("id", { count: "exact" })
        .eq("owner_id", user.id);

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
        max_participants: 50, // Default value
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

    // Invalidate user spaces cache
    revalidateTag(`user-spaces-${user.id}`, "default");
    revalidateTag(`space-${uuid}`, "default");

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
  "use cache";
  
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

    // Tag cache with user ID for targeted invalidation
    cacheTag(`user-spaces-${user.id}`);

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

    // Find active space (excluding draft)
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
      // Note: Fetching actual data instead of using count to avoid RLS recursion issues
      const { data: participantsData } = await supabase
        .from("participants")
        .select("id")
        .eq("space_id", activeSpaceData.id);

      const count = participantsData?.length ?? 0;

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
