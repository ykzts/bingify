"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";

export interface UpdateScreenSettingsResult {
  error?: string;
  success: boolean;
}

/**
 * Get screen settings for a space
 */
export async function getScreenSettings(spaceId: string): Promise<{
  background: BackgroundType;
  display_mode: DisplayMode;
  locale?: LocaleType;
  theme: ThemeType;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("screen_settings")
    .select("background, display_mode, locale, theme")
    .eq("space_id", spaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    background: data.background as BackgroundType,
    display_mode: data.display_mode as DisplayMode,
    locale: (data.locale as LocaleType) || undefined,
    theme: (data.theme as ThemeType) || "dark",
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
    locale?: LocaleType;
    theme: ThemeType;
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
      locale: settings.locale,
      space_id: spaceId,
      theme: settings.theme,
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

  // Revalidate the space page (use pattern form for dynamic routes)
  revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

  return {
    success: true,
  };
}
