"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";

export interface JoinSpaceState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export interface SpaceInfo {
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
      .select("id, share_key, status, owner_id, max_participants")
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

export async function joinSpace(spaceId: string): Promise<JoinSpaceState> {
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
