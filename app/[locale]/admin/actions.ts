"use server";

import { z } from "zod";
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
 * Validate UUID format using Zod
 */
function isValidUuid(uuid: string): boolean {
  return z.string().uuid().safeParse(uuid).success;
}

/**
 * Verify that the current user has admin role
 */
async function verifyAdminRole(): Promise<{
  isAdmin: boolean;
  userId?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isAdmin: profile?.role === "admin",
    userId: user.id,
  };
}

/**
 * Force delete a space (bypassing RLS)
 */
export async function forceDeleteSpace(
  spaceId: string
): Promise<AdminActionResult> {
  try {
    // Validate UUID format
    if (!isValidUuid(spaceId)) {
      return {
        error: "errorInvalidUuid",
        success: false,
      };
    }

    // Verify admin role
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("spaces")
      .delete()
      .eq("id", spaceId);

    if (error) {
      console.error("Failed to delete space:", error);
      return {
        error: "deleteError",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in forceDeleteSpace:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}

/**
 * Ban a user (delete their account)
 * Note: This will delete the user's auth account and profile.
 * Bingo cards with matching user_id will remain in the database as orphaned records.
 * Consider implementing additional cleanup logic if needed.
 */
export async function banUser(userId: string): Promise<AdminActionResult> {
  try {
    // Validate UUID format
    if (!isValidUuid(userId)) {
      return {
        error: "errorInvalidUuid",
        success: false,
      };
    }

    // Verify admin role and get current user ID
    const { isAdmin, userId: currentUserId } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    // Prevent self-banning
    if (userId === currentUserId) {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    // Check target user's role - prevent banning other admins
    const adminClient = createAdminClient();
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "admin") {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Failed to ban user:", error);
      return {
        error: "banError",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in banUser:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}

/**
 * Get all spaces (for admin dashboard) with pagination
 */
export async function getAllSpaces(
  page = 1,
  perPage = 50
): Promise<{
  error?: string;
  hasMore?: boolean;
  spaces?: Space[];
}> {
  try {
    // Verify admin role
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
      };
    }

    const adminClient = createAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage;

    const { data, error } = await adminClient
      .from("spaces")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to - 1);

    if (error) {
      console.error("Failed to fetch spaces:", error);
      return {
        error: "errorGeneric",
      };
    }

    return {
      hasMore: (data?.length || 0) === perPage,
      spaces: data || [],
    };
  } catch (error) {
    console.error("Error in getAllSpaces:", error);
    return {
      error: "errorGeneric",
    };
  }
}

/**
 * Get all users (for admin dashboard) with pagination
 */
export async function getAllUsers(
  page = 1,
  perPage = 50
): Promise<{
  error?: string;
  hasMore?: boolean;
  users?: User[];
}> {
  try {
    // Verify admin role
    const { isAdmin } = await verifyAdminRole();
    if (!isAdmin) {
      return {
        error: "errorNoPermission",
      };
    }

    const adminClient = createAdminClient();
    const from = (page - 1) * perPage;
    const to = from + perPage;

    const { data, error } = await adminClient
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to - 1);

    if (error) {
      console.error("Failed to fetch users:", error);
      return {
        error: "errorGeneric",
      };
    }

    return {
      hasMore: (data?.length || 0) === perPage,
      users: data || [],
    };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return {
      error: "errorGeneric",
    };
  }
}
