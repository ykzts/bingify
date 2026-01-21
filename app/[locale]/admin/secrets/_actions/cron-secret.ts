"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

// Constant for "Secret not found" error message from RPC
const CRON_SECRET_NOT_FOUND = "Secret not found";

interface AdminCheckResult {
  error?: string;
  user?: User;
}

/**
 * Helper function to check if the current user is an admin
 * @returns Object with either user or error
 */
async function ensureAdminOrError(): Promise<AdminCheckResult> {
  const t = await getTranslations("AdminSecrets.cron");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("cronErrorUnauthorized") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: t("errorNoPermission") };
  }

  return { user };
}

export interface GetCronSecretResult {
  error?: string;
  hasSecret?: boolean;
  isSetInEnv?: boolean;
  updatedAt?: string;
}

/**
 * Get the cron secret from the database (admin only)
 * Note: Secret value is not returned for security - only existence and metadata
 */
export async function getCronSecret(): Promise<GetCronSecretResult> {
  const t = await getTranslations("AdminSecrets.cron");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    // Check if environment variable is set
    const isSetInEnv = !!process.env.CRON_SECRET;

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_cron_secret");

    if (error) {
      console.error("Error fetching cron secret:", error);
      return { error: t("errorFetchFailed"), isSetInEnv };
    }

    // Type assertion for the RPC result
    const result = data as
      | { success: false; error: string }
      | { success: true; data: { secret: string; updated_at: string } };

    if (!result?.success) {
      // Secret not found is not an error - it just means it hasn't been set yet
      if ("error" in result && result.error === CRON_SECRET_NOT_FOUND) {
        return { hasSecret: false, isSetInEnv };
      }
      return {
        error:
          ("error" in result ? result.error : undefined) ||
          t("errorFetchFailed"),
        isSetInEnv,
      };
    }

    return {
      hasSecret: true,
      isSetInEnv,
      updatedAt: result.data?.updated_at,
    };
  } catch (error) {
    console.error("Error in getCronSecret:", error);
    const isSetInEnv = !!process.env.CRON_SECRET;
    return { error: t("cronErrorGeneric"), isSetInEnv };
  }
}

export interface UpsertCronSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Upsert (create or update) the cron secret (admin only)
 */
export async function upsertCronSecret(
  secret: string
): Promise<UpsertCronSecretResult> {
  const t = await getTranslations("AdminSecrets.cron");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    // Validate secret on the server side
    if (!secret || secret.trim() === "") {
      return { error: t("errorEmptySecret") };
    }

    const trimmedSecret = secret.trim();

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("upsert_cron_secret", {
      p_secret: trimmedSecret,
    });

    if (error) {
      console.error("Error upserting cron secret:", error);
      return { error: t("errorUpsertFailed") };
    }

    // Type assertion for the RPC result
    const result = data as { success: boolean; error?: string };

    if (!result?.success) {
      return { error: result?.error || t("errorUpsertFailed") };
    }

    // Revalidate the secrets page
    revalidatePath("/[locale]/admin/secrets", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in upsertCronSecret:", error);
    return { error: t("cronErrorGeneric") };
  }
}

export interface DeleteCronSecretResult {
  error?: string;
  success?: boolean;
}

/**
 * Delete the cron secret (admin only)
 */
export async function deleteCronSecret(): Promise<DeleteCronSecretResult> {
  const t = await getTranslations("AdminSecrets.cron");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("delete_cron_secret");

    if (error) {
      console.error("Error deleting cron secret:", error);
      return { error: t("errorDeleteFailed") };
    }

    // Type assertion for the RPC result
    const result = data as { success: boolean; error?: string };

    if (!result?.success) {
      return { error: result?.error || t("errorDeleteFailed") };
    }

    // Revalidate the secrets page
    revalidatePath("/[locale]/admin/secrets", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteCronSecret:", error);
    return { error: t("cronErrorGeneric") };
  }
}
