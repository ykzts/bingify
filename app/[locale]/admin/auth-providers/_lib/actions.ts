"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AuthProviderRow {
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

/**
 * Get all auth providers from the database
 */
export async function getAuthProviders(): Promise<GetAuthProvidersResult> {
  try {
    const supabase = await createClient();

    // Check if user is admin
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

    const { data, error } = await supabase
      .from("system_auth_providers")
      .select("*")
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
 * Update auth provider status
 */
export async function updateAuthProvider(
  provider: string,
  isEnabled: boolean
): Promise<UpdateAuthProviderResult> {
  try {
    const supabase = await createClient();

    // Check if user is admin
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
