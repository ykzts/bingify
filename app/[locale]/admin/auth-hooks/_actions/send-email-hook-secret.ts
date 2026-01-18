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

export interface GetSendEmailHookSecretResult {
  error?: string;
  secret?: string;
  updatedAt?: string;
}

/**
 * Get the send email hook secret from the database (admin only)
 */
export async function getSendEmailHookSecret(): Promise<GetSendEmailHookSecretResult> {
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

    // Type assertion for the RPC result
    const result = data as
      | { success: false; error: string }
      | { success: true; data: { secret: string; updated_at: string } };

    if (!result?.success) {
      // Secret not found is not an error - it just means it hasn't been set yet
      if (result?.error === "Secret not found") {
        return { secret: undefined };
      }
      return { error: result?.error || "errorFetchFailed" };
    }

    return {
      secret: result.data?.secret,
      updatedAt: result.data?.updated_at,
    };
  } catch (error) {
    console.error("Error in getEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}

export interface UpsertSendEmailHookSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Upsert (create or update) the send email hook secret (admin only)
 */
export async function upsertSendEmailHookSecret(
  secret: string
): Promise<UpsertSendEmailHookSecretResult> {
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

    // Type assertion for the RPC result
    const result = data as { success: boolean; error?: string };

    if (!result?.success) {
      return { error: result?.error || "errorUpsertFailed" };
    }

    // Revalidate the email hook page
    revalidatePath("/[locale]/admin/auth-hooks", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in upsertEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}

export interface DeleteSendEmailHookSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Delete the send email hook secret (admin only)
 */
export async function deleteSendEmailHookSecret(): Promise<DeleteSendEmailHookSecretResult> {
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

    // Type assertion for the RPC result
    const result = data as { success: boolean; error?: string };

    if (!result?.success) {
      return { error: result?.error || "errorDeleteFailed" };
    }

    // Revalidate the email hook page
    revalidatePath("/[locale]/admin/auth-hooks", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteEmailHookSecret:", error);
    return { error: "errorGeneric" };
  }
}
