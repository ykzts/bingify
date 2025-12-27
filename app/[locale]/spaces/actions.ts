"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface JoinSpaceState {
  error?: string;
  success: boolean;
}

export async function joinSpace(spaceId: string): Promise<JoinSpaceState> {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "認証が必要です",
        success: false,
      };
    }

    // Check if space exists and is active
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("id, status")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space) {
      return {
        error: "スペースが見つかりません",
        success: false,
      };
    }

    if (space.status !== "active") {
      return {
        error: "このスペースは利用できません",
        success: false,
      };
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from("space_members")
      .select("id")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (memberCheckError && memberCheckError.code !== "PGRST116") {
      // PGRST116 is "not found", which is expected for non-members
      console.error("Error checking membership:", memberCheckError);
      return {
        error: "メンバーシップの確認に失敗しました",
        success: false,
      };
    }

    if (existingMember) {
      // Already a member, this is success
      return {
        success: true,
      };
    }

    // Add user as member
    const { error: insertError } = await supabase.from("space_members").insert({
      role: "member",
      space_id: spaceId,
      user_id: user.id,
    });

    if (insertError) {
      console.error("Error joining space:", insertError);
      return {
        error: "スペースへの参加に失敗しました",
        success: false,
      };
    }

    // Revalidate the space page
    revalidatePath(`/spaces/${spaceId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in joinSpace:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

export async function getSpaceByShareKey(shareKey: string) {
  try {
    const supabase = await createClient();

    const { data: space, error } = await supabase
      .from("spaces")
      .select("id, share_key, status, created_at")
      .eq("share_key", shareKey)
      .eq("status", "active")
      .single();

    if (error || !space) {
      return null;
    }

    return space;
  } catch (error) {
    console.error("Error getting space by share key:", error);
    return null;
  }
}

export async function checkSpaceMembership(spaceId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isMember: false, isAuthenticated: false };
    }

    const { data: member, error: memberError } = await supabase
      .from("space_members")
      .select("id, role")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    // Log error if it's not just "not found"
    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error checking membership:", memberError);
      return { error: true, isAuthenticated: true, isMember: false };
    }

    return {
      isAuthenticated: true,
      isMember: !!member,
      role: member?.role,
    };
  } catch (error) {
    console.error("Error checking membership:", error);
    return { error: true, isAuthenticated: false, isMember: false };
  }
}
