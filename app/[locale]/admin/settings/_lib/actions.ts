"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import {
  type SystemSettings,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import { systemSettingsFormOpts } from "./form-options";

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

    // Parse with defaults for each field
    const defaultSettings: SystemSettings = {
      default_user_role: "organizer",
      features: {
        gatekeeper: {
          email: { enabled: true },
          twitch: { enabled: true },
          youtube: { enabled: true },
        },
      },
      max_participants_per_space: 50,
      max_spaces_per_user: 5,
      max_total_spaces: 1000,
      space_expiration_hours: 48,
    };

    // Try to parse each field individually, using defaults for failures
    const settings: SystemSettings = {
      default_user_role:
        data.default_user_role === "organizer" ||
        data.default_user_role === "user"
          ? data.default_user_role
          : (() => {
              warnings.push("default_user_role");
              return defaultSettings.default_user_role;
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
          return defaultSettings.features;
        } catch {
          warnings.push("features");
          return defaultSettings.features;
        }
      })(),

      max_participants_per_space: (() => {
        const value = Number(data.max_participants_per_space);
        if (!Number.isNaN(value) && value >= 1 && value <= 10_000) {
          return value;
        }
        warnings.push("max_participants_per_space");
        return defaultSettings.max_participants_per_space;
      })(),

      max_spaces_per_user: (() => {
        const value = Number(data.max_spaces_per_user);
        if (!Number.isNaN(value) && value >= 1 && value <= 100) {
          return value;
        }
        warnings.push("max_spaces_per_user");
        return defaultSettings.max_spaces_per_user;
      })(),

      max_total_spaces: (() => {
        const value = Number(data.max_total_spaces);
        if (!Number.isNaN(value) && value >= 0 && value <= 100_000) {
          return value;
        }
        warnings.push("max_total_spaces");
        return defaultSettings.max_total_spaces;
      })(),

      space_expiration_hours: (() => {
        const value = Number(data.space_expiration_hours);
        if (!Number.isNaN(value) && value >= 0 && value <= 8760) {
          return value;
        }
        warnings.push("space_expiration_hours");
        return defaultSettings.space_expiration_hours;
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

async function checkAdminPermission(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "errorUnauthorized", user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "errorNoPermission", user: null };
  }

  return { error: null, user };
}

// Create the server validation function
const serverValidate = createServerValidate({
  ...systemSettingsFormOpts,
  onServerValidate: async () => {
    const supabase = await createClient();

    // Check admin permission
    const { error: permissionError } = await checkAdminPermission(supabase);
    if (permissionError) {
      return { form: permissionError };
    }

    return undefined;
  },
});

export async function updateSystemSettingsAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Validate the form data
    const validatedData = await serverValidate(formData);

    const supabase = await createClient();

    // Double check admin permission
    const { error: permissionError } = await checkAdminPermission(supabase);
    if (permissionError) {
      return {
        ...initialFormState,
        errors: [permissionError],
      };
    }

    // Update system settings
    const { error } = await supabase
      .from("system_settings")
      .update(validatedData)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("Error updating system settings:", error);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
      };
    }

    // Return success state
    return {
      ...initialFormState,
      values: validatedData,
      meta: {
        success: true,
      },
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error in updateSystemSettingsAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
    };
  }
}

// Keep the old function for backward compatibility during migration
export interface UpdateSystemSettingsState {
  error?: string;
  success: boolean;
}

export async function updateSystemSettings(
  _prevState: UpdateSystemSettingsState,
  formData: FormData
): Promise<UpdateSystemSettingsState> {
  try {
    const supabase = await createClient();

    // Check admin permission
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "errorUnauthorized",
        success: false,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return {
        error: "errorNoPermission",
        success: false,
      };
    }

    // Parse and validate form data
    const maxParticipantsRaw = formData.get(
      "max_participants_per_space"
    ) as string;
    const maxSpacesRaw = formData.get("max_spaces_per_user") as string;
    const maxTotalSpacesRaw = formData.get("max_total_spaces") as string;
    const expirationHoursRaw = formData.get("space_expiration_hours") as string;
    const defaultUserRole = formData.get("default_user_role") as string;

    // Parse feature flags
    const gatekeeperYoutubeEnabled =
      formData.get("features.gatekeeper.youtube.enabled") === "true";
    const gatekeeperTwitchEnabled =
      formData.get("features.gatekeeper.twitch.enabled") === "true";
    const gatekeeperEmailEnabled =
      formData.get("features.gatekeeper.email.enabled") === "true";

    const validation = systemSettingsSchema.safeParse({
      default_user_role: defaultUserRole,
      features: {
        gatekeeper: {
          email: { enabled: gatekeeperEmailEnabled },
          twitch: { enabled: gatekeeperTwitchEnabled },
          youtube: { enabled: gatekeeperYoutubeEnabled },
        },
      },
      max_participants_per_space: Number.parseInt(maxParticipantsRaw, 10),
      max_spaces_per_user: Number.parseInt(maxSpacesRaw, 10),
      max_total_spaces: Number.parseInt(maxTotalSpacesRaw, 10),
      space_expiration_hours: Number.parseInt(expirationHoursRaw, 10),
    });

    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

    const { error } = await supabase
      .from("system_settings")
      .update(validation.data)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      console.error("Error updating system settings:", error);
      return {
        error: "errorUpdateFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in updateSystemSettings:", error);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}
