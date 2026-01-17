"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface AdminCheckResult {
  error?: "errorUnauthorized" | "errorNoPermission";
  user?: User;
}

/**
 * Helper function to check if the current user is an admin
 * @returns Object with either user or error
 */
async function ensureAdminOrError(): Promise<AdminCheckResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "errorUnauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "errorNoPermission" };
  }

  return { user };
}

export interface GetEmailHookSecretResult {
  error?: string;
  secret?: string;
  updatedAt?: string;
}

/**
 * Get the email hook secret from the database (admin only)
 */
export async function getEmailHookSecret(): Promise<GetEmailHookSecretResult> {
  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_auth_hook_secret");

    if (error) {
      console.error("Error fetching email hook secret:", error);
      return { error: "errorFetchFailed" };
    }

    if (!data?.success) {
      // Secret not found is not an error - it just means it hasn't been set yet
      if (data?.error === "Secret not found") {
        return { secret: undefined };
      }
      return { error: data?.error || "errorFetchFailed" };
    }

    return {
      secret: data.data?.secret,
      updatedAt: data.data?.updated_at,
    };
  } catch (error) {
    console.error("Error in getEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}

export interface UpsertEmailHookSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Upsert (create or update) the email hook secret (admin only)
 */
export async function upsertEmailHookSecret(
  secret: string
): Promise<UpsertEmailHookSecretResult> {
  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    // Validate secret format on the server side
    if (!secret || secret.trim() === "") {
      return { error: "errorEmptySecret" };
    }

    const trimmedSecret = secret.trim();

    if (!trimmedSecret.startsWith("v1,whsec_")) {
      return { error: "errorInvalidFormat" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("upsert_auth_hook_secret", {
      p_secret: trimmedSecret,
    });

    if (error) {
      console.error("Error upserting email hook secret:", error);
      return { error: "errorUpsertFailed" };
    }

    if (!data?.success) {
      return { error: data?.error || "errorUpsertFailed" };
    }

    // Revalidate the email hook page
    revalidatePath("/[locale]/admin/email-hook", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in upsertEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}

export interface DeleteEmailHookSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Delete the email hook secret (admin only)
 */
export async function deleteEmailHookSecret(): Promise<DeleteEmailHookSecretResult> {
  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("delete_auth_hook_secret");

    if (error) {
      console.error("Error deleting email hook secret:", error);
      return { error: "errorDeleteFailed" };
    }

    if (!data?.success) {
      return { error: data?.error || "errorDeleteFailed" };
    }

    // Revalidate the email hook page
    revalidatePath("/[locale]/admin/email-hook", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}
