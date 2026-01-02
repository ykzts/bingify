import {
  type SystemSettings,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";

export interface GetSystemSettingsResult {
  error?: string;
  settings?: SystemSettings;
}

/**
 * Get system settings with validated JSONB features column
 * @returns System settings with validated features, or error
 */
export async function getSystemSettings(): Promise<GetSystemSettingsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("system_settings")
      .select(
        "default_user_role, features, max_participants_per_space, max_spaces_per_user, max_total_spaces, space_expiration_hours"
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      return {
        error: "errorFetchFailed",
      };
    }

    // Validate the entire settings object including the JSONB features field
    const settingsValidation = systemSettingsSchema.safeParse(data);

    if (!settingsValidation.success) {
      console.error(
        "Invalid system settings data from DB:",
        settingsValidation.error
      );
      return {
        error: "errorInvalidData",
      };
    }

    return {
      settings: settingsValidation.data,
    };
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    return {
      error: "errorGeneric",
    };
  }
}
