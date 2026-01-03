import {
  type SystemSettings,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";

export interface GetSystemSettingsResult {
  error?: string;
  settings?: SystemSettings;
  warnings?: string[];
}

/**
 * Get system settings with validated JSONB features column
 * Only applies fallback for the features JSONB field if corrupted
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

    if (!data) {
      return {
        error: "errorNoData",
      };
    }

    // Validate the entire settings object
    const settingsValidation = systemSettingsSchema.safeParse(data);

    if (settingsValidation.success) {
      return {
        settings: settingsValidation.data,
      };
    }

    // Only apply fallback for the features JSONB field
    // Other fields are database columns with constraints and should fail validation
    console.warn(
      "System settings validation failed, checking if features field is corrupted:",
      settingsValidation.error
    );

    // Check if the issue is with the features field specifically
    const featuresValidation = systemSettingsSchema.shape.features.safeParse(
      data.features
    );

    if (!featuresValidation.success) {
      // Features field is corrupted, use default
      console.warn(
        "Features JSONB field is corrupted, using default:",
        featuresValidation.error
      );

      const defaultFeatures = {
        gatekeeper: {
          email: { enabled: true },
          twitch: { enabled: true },
          youtube: { enabled: true },
        },
      };

      // Try validation again with default features
      const retryValidation = systemSettingsSchema.safeParse({
        ...data,
        features: defaultFeatures,
      });

      if (retryValidation.success) {
        return {
          settings: retryValidation.data,
          warnings: ["features"],
        };
      }
    }

    // If validation still fails, it's not just the features field
    console.error(
      "System settings validation failed for non-features fields:",
      settingsValidation.error
    );
    return {
      error: "errorInvalidData",
    };
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    return {
      error: "errorGeneric",
    };
  }
}
