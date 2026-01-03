"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BackgroundType, DisplayMode } from "@/lib/types/screen-settings";

export interface UpdateScreenSettingsResult {
  error?: string;
  success: boolean;
}

/**
 * Get screen settings for a space
 */
export async function getScreenSettings(
  spaceId: string
): Promise<{ background: BackgroundType; display_mode: DisplayMode } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("screen_settings")
    .select("background, display_mode")
    .eq("space_id", spaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    background: data.background as BackgroundType,
    display_mode: data.display_mode as DisplayMode,
  };
}

/**
 * Update screen settings for a space (upsert)
 */
export async function updateScreenSettings(
  spaceId: string,
  settings: {
    background: BackgroundType;
    display_mode: DisplayMode;
  }
): Promise<UpdateScreenSettingsResult> {
  const supabase = await createClient();

  // First, verify that the user has permission to update this space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, owner_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    return {
      error: "Space not found",
      success: false,
    };
  }

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  // Check if user is owner or admin
  const isOwner = space.owner_id === user.id;
  const { data: spaceRole } = await supabase
    .from("space_roles")
    .select("role")
    .eq("space_id", spaceId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = spaceRole?.role === "admin";

  if (!(isOwner || isAdmin)) {
    return {
      error: "Permission denied",
      success: false,
    };
  }

  // Upsert the settings
  const { error: upsertError } = await supabase.from("screen_settings").upsert(
    {
      background: settings.background,
      display_mode: settings.display_mode,
      space_id: spaceId,
    },
    {
      onConflict: "space_id",
    }
  );

  if (upsertError) {
    return {
      error: "Failed to update settings",
      success: false,
    };
  }

  // Revalidate the space page
  revalidatePath(`/[locale]/dashboard/spaces/${spaceId}`);

  return {
    success: true,
  };
}
