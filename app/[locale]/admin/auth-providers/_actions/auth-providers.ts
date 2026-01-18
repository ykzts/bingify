"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  getOAuthProviderConfig,
  upsertOAuthProviderConfig,
} from "@/lib/data/oauth-provider-config";
import { createClient } from "@/lib/supabase/server";

export interface AuthProviderRow {
  client_id: string | null;
  created_at: string | null;
  is_enabled: boolean;
  label: string | null;
  provider: string;
  updated_at: string | null;
}

export interface GetAuthProvidersResult {
  error?: string;
  providers?: AuthProviderRow[];
}

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

/**
 * Get all auth providers from the database
 * Note: This relies on RLS policy for access control (public read allowed)
 */
export async function getAuthProviders(): Promise<GetAuthProvidersResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("system_auth_providers")
      .select("provider, label, is_enabled, client_id, created_at, updated_at")
      .order("provider", { ascending: true });

    if (error) {
      console.error("Error fetching auth providers:", error);
      return { error: "errorFetchFailed" };
    }

    return { providers: data || [] };
  } catch (error) {
    console.error("Error in getAuthProviders:", error);
    return { error: "errorGeneric" };
  }
}

export interface UpdateAuthProviderResult {
  error?: string;
  success?: boolean;
}

/**
 * Update auth provider status (admin only)
 */
export async function updateAuthProvider(
  provider: string,
  isEnabled: boolean
): Promise<UpdateAuthProviderResult> {
  try {
    // Admin check required for mutations
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("system_auth_providers")
      .update({ is_enabled: isEnabled })
      .eq("provider", provider);

    if (error) {
      console.error("Error updating auth provider:", error);
      return { error: "errorUpdateFailed" };
    }

    // Revalidate login page to reflect changes
    revalidatePath("/[locale]/login", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in updateAuthProvider:", error);
    return { error: "errorGeneric" };
  }
}

/**
 * Get OAuth provider configuration (admin only)
 */
export async function getProviderOAuthConfig(
  provider: string
): Promise<{
  clientId?: string | null;
  error?: string;
  hasSecret?: boolean;
}> {
  try {
    // Admin check required
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();
    const result = await getOAuthProviderConfig(supabase, provider);

    if (!result.success || !result.data) {
      return { error: result.error || "errorFetchFailed" };
    }

    return {
      clientId: result.data.client_id,
      hasSecret: !!result.data.client_secret,
    };
  } catch (error) {
    console.error("Error in getProviderOAuthConfig:", error);
    return { error: "errorGeneric" };
  }
}

/**
 * Update OAuth provider configuration (admin only)
 */
export async function updateProviderOAuthConfig(
  provider: string,
  clientId: string,
  clientSecret?: string
): Promise<UpdateAuthProviderResult> {
  try {
    // Admin check required for mutations
    const adminCheck = await ensureAdminOrError();
    if (adminCheck.error) {
      return { error: adminCheck.error };
    }

    const supabase = await createClient();
    const result = await upsertOAuthProviderConfig(
      supabase,
      provider,
      clientId,
      clientSecret
    );

    if (!result.success) {
      return { error: result.error || "errorUpdateFailed" };
    }

    // Revalidate admin page to reflect changes
    revalidatePath("/[locale]/admin/auth-providers", "page");

    return { success: true };
  } catch (error) {
    console.error("Error in updateProviderOAuthConfig:", error);
    return { error: "errorGeneric" };
  }
}
