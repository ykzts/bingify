"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface AdminActionResult {
  error?: string;
  success: boolean;
}

interface Space {
  created_at: string | null;
  id: string;
  settings: Record<string, unknown> | null;
  share_key: string;
  status: string | null;
  updated_at: string | null;
}

interface User {
  avatar_url: string | null;
  created_at: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
  role: string;
  updated_at: string | null;
}

/**
 * Verify that the current user has admin role
 */
async function verifyAdminRole(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

/**
 * Force delete a space (bypassing RLS)
 */
export async function forceDeleteSpace(
  spaceId: string
): Promise<AdminActionResult> {
  try {
    // Verify admin role
    const isAdmin = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "管理者権限が必要です",
        success: false,
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("spaces").delete().eq("id", spaceId);

    if (error) {
      console.error("Failed to delete space:", error);
      return {
        error: "スペースの削除に失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in forceDeleteSpace:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

/**
 * Ban a user (delete their account)
 */
export async function banUser(userId: string): Promise<AdminActionResult> {
  try {
    // Verify admin role
    const isAdmin = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "管理者権限が必要です",
        success: false,
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Failed to ban user:", error);
      return {
        error: "ユーザーのBANに失敗しました",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in banUser:", error);
    return {
      error: "予期しないエラーが発生しました",
      success: false,
    };
  }
}

/**
 * Get all spaces (for admin dashboard)
 */
export async function getAllSpaces(): Promise<{
  error?: string;
  spaces?: Space[];
}> {
  try {
    // Verify admin role
    const isAdmin = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "管理者権限が必要です",
      };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch spaces:", error);
      return {
        error: "スペースの取得に失敗しました",
      };
    }

    return {
      spaces: data || [],
    };
  } catch (error) {
    console.error("Error in getAllSpaces:", error);
    return {
      error: "予期しないエラーが発生しました",
    };
  }
}

/**
 * Get all users (for admin dashboard)
 */
export async function getAllUsers(): Promise<{
  error?: string;
  users?: User[];
}> {
  try {
    // Verify admin role
    const isAdmin = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "管理者権限が必要です",
      };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch users:", error);
      return {
        error: "ユーザーの取得に失敗しました",
      };
    }

    return {
      users: data || [],
    };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return {
      error: "予期しないエラーが発生しました",
    };
  }
}
