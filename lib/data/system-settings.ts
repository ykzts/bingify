import {
  type SystemSettings,
  systemFeaturesSchema,
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

    // Validate the features field using Zod schema
    const featuresValidation = systemFeaturesSchema.safeParse(data.features);
    if (!featuresValidation.success) {
      console.error("Invalid features data from DB:", featuresValidation.error);
      return {
        error: "errorInvalidData",
      };
    }

    // Validate the entire settings object
    const settingsValidation = systemSettingsSchema.safeParse({
      default_user_role: data.default_user_role,
      features: featuresValidation.data,
      max_participants_per_space: data.max_participants_per_space,
      max_spaces_per_user: data.max_spaces_per_user,
      max_total_spaces: data.max_total_spaces,
      space_expiration_hours: data.space_expiration_hours,
    });

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
