"use server";

import { createClient } from "@/lib/supabase/server";

export interface JoinSpaceState {
  error?: string;
  success: boolean;
}

export async function joinSpace(spaceId: string): Promise<JoinSpaceState> {
  try {
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

    // Check if user has already joined
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return {
        success: true,
      };
    }

    // Try to join the space
    const { error } = await supabase.from("participants").insert({
      space_id: spaceId,
      user_id: user.id,
    });

    if (error) {
      // Check if it's a quota error
      if (error.code === "P0001" || error.message.includes("limit reached")) {
        return {
          error: "スペースの参加者数が上限に達しています",
          success: false,
        };
      }

      console.error("Database error:", error);
      return {
        error: "スペースへの参加に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error joining space:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export async function leaveSpace(spaceId: string): Promise<JoinSpaceState> {
  try {
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

    // Remove user from participants
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("space_id", spaceId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return {
        error: "スペースからの退出に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error leaving space:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export async function getParticipantCount(
  spaceId: string
): Promise<{ count: number; maxParticipants: number } | null> {
  try {
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
