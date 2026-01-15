"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("ScreenSettingsActions");
  const supabase = await createClient();

  // First, verify that the user has permission to update this space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, owner_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    return {
      error: t("errorSpaceNotFound"),
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
      error: t("errorUnauthorized"),
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
      error: t("errorPermissionDenied"),
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
      error: t("errorUpdateFailed"),
      success: false,
    };
  }

  // Revalidate the space page (use pattern form for dynamic routes)
  revalidatePath("/[locale]/dashboard/spaces/[id]", "page");

  return {
    success: true,
  };
}
