"use server";

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

export async function getSystemSettings(): Promise<GetSystemSettingsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("system_settings")
      .select(
        "max_participants_per_space, max_spaces_per_user, space_expiration_hours, features, default_user_role"
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

    const settings: SystemSettings = {
      default_user_role: (data.default_user_role ||
        "organizer") as "organizer" | "user",
      features: featuresValidation.data,
      max_participants_per_space: data.max_participants_per_space,
      max_spaces_per_user: data.max_spaces_per_user,
      space_expiration_hours: data.space_expiration_hours,
    };

    return {
      settings,
    };
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    return {
      error: "errorGeneric",
    };
  }
}

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
