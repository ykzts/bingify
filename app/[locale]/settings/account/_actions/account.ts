"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface DeleteAccountState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

/**
 * Delete the current user's account
 * This will permanently delete the user's account and all associated data
 */
export async function deleteAccount(): Promise<DeleteAccountState> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    // Check if the user is an admin - prevent admin self-deletion
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return {
        errorKey: "errorAdminCannotDelete",
        success: false,
      };
    }

    // Use admin client to delete the user
    // This will cascade delete all related data (profiles, bingo_cards, etc.)
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Failed to delete account:", error);
      return {
        errorKey: "errorDeleteFailed",
        success: false,
      };
    }

    // Sign out the user (session should be invalidated anyway)
    await supabase.auth.signOut();

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting account:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}
