"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

// Constant for "Secret not found" error message from RPC
const AUTH_HOOK_SECRET_NOT_FOUND = "Secret not found";

interface AdminCheckResult {
  error?: string;
  user?: User;
}

/**
 * Helper function to check if the current user is an admin
 * @returns Object with either user or error
 */
async function ensureAdminOrError(): Promise<AdminCheckResult> {
  const t = await getTranslations("AdminSecrets.authHooks");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errorUnauthorized") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: t("authHooksErrorNoPermission") };
  }

  return { user };
}

export interface GetSendEmailHookSecretResult {
  error?: string;
  hasSecret?: boolean;
  isSetInEnv?: boolean;
  updatedAt?: string;
}

/**
 * Get the send email hook secret from the database (admin only)
 * Note: Secret value is not returned for security - only existence and metadata
 */
export async function getSendEmailHookSecret(): Promise<GetSendEmailHookSecretResult> {
  const t = await getTranslations("AdminSecrets.authHooks");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    // Check if environment variable is set
    const isSetInEnv = !!process.env.SEND_EMAIL_HOOK_SECRET;

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_auth_hook_secret", {
      p_hook_name: "send-email-hook",
    });

    if (error) {
      console.error("Error fetching send email hook secret:", error);
      return { error: t("errorFetchFailed"), isSetInEnv };
    }

    // Type assertion for the RPC result
    const result = data as
      | { success: false; error: string }
      | { success: true; data: { secret: string; updated_at: string } };

    if (!result?.success) {
      // Secret not found is not an error - it just means it hasn't been set yet
      if ("error" in result && result.error === AUTH_HOOK_SECRET_NOT_FOUND) {
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
    console.error("Error in getSendEmailHookSecret:", error);
    const isSetInEnv = !!process.env.SEND_EMAIL_HOOK_SECRET;
    return { error: t("authHooksErrorGeneric"), isSetInEnv };
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
  const t = await getTranslations("AdminSecrets.authHooks");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    // Validate secret format on the server side
    if (!secret || secret.trim() === "") {
      return { error: t("errorEmptySecret") };
    }

    const trimmedSecret = secret.trim();

    if (!trimmedSecret.startsWith("v1,whsec_")) {
      return { error: t("errorInvalidFormat") };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("upsert_auth_hook_secret", {
      p_hook_name: "send-email-hook",
      p_secret: trimmedSecret,
    });

    if (error) {
      console.error("Error upserting email hook secret:", error);
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
    console.error("Error in upsertSendEmailHookSecret:", error);
    return { error: t("authHooksErrorGeneric") };
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
  const t = await getTranslations("AdminSecrets.authHooks");

  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("delete_auth_hook_secret", {
      p_hook_name: "send-email-hook",
    });

    if (error) {
      console.error("Error deleting email hook secret:", error);
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
    console.error("Error in deleteSendEmailHookSecret:", error);
    return { error: t("authHooksErrorGeneric") };
  }
}
