import {
  DEFAULT_SYSTEM_SETTINGS,
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
 * Uses default values for invalid fields instead of failing entirely
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

    // Validate the entire settings object including the JSONB features field
    const settingsValidation = systemSettingsSchema.safeParse(data);

    if (settingsValidation.success) {
      return {
        settings: settingsValidation.data,
      };
    }

    // If validation fails, try to use default values for invalid fields
    console.warn(
      "System settings validation failed, using defaults for invalid fields:",
      settingsValidation.error
    );

    const warnings: string[] = [];

    // Try to parse each field individually, using defaults for failures
    const settings: SystemSettings = {
      default_user_role:
        data.default_user_role === "organizer" ||
        data.default_user_role === "user"
          ? data.default_user_role
          : (() => {
              warnings.push("default_user_role");
              return DEFAULT_SYSTEM_SETTINGS.default_user_role;
            })(),

      features: (() => {
        try {
          const featuresResult = systemSettingsSchema.shape.features.safeParse(
            data.features
          );
          if (featuresResult.success) {
            return featuresResult.data;
          }
          warnings.push("features");
          return DEFAULT_SYSTEM_SETTINGS.features;
        } catch {
          warnings.push("features");
          return DEFAULT_SYSTEM_SETTINGS.features;
        }
      })(),

      max_participants_per_space: (() => {
        const value = Number(data.max_participants_per_space);
        if (!Number.isNaN(value) && value >= 1 && value <= 10_000) {
          return value;
        }
        warnings.push("max_participants_per_space");
        return DEFAULT_SYSTEM_SETTINGS.max_participants_per_space;
      })(),

      max_spaces_per_user: (() => {
        const value = Number(data.max_spaces_per_user);
        if (!Number.isNaN(value) && value >= 1 && value <= 100) {
          return value;
        }
        warnings.push("max_spaces_per_user");
        return DEFAULT_SYSTEM_SETTINGS.max_spaces_per_user;
      })(),

      max_total_spaces: (() => {
        const value = Number(data.max_total_spaces);
        if (!Number.isNaN(value) && value >= 0 && value <= 100_000) {
          return value;
        }
        warnings.push("max_total_spaces");
        return DEFAULT_SYSTEM_SETTINGS.max_total_spaces;
      })(),

      space_expiration_hours: (() => {
        const value = Number(data.space_expiration_hours);
        if (!Number.isNaN(value) && value >= 0 && value <= 8760) {
          return value;
        }
        warnings.push("space_expiration_hours");
        return DEFAULT_SYSTEM_SETTINGS.space_expiration_hours;
      })(),
    };

    return {
      settings,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    return {
      error: "errorGeneric",
    };
  }
}
