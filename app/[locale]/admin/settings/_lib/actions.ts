"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { systemSettingsSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import { systemSettingsFormOpts } from "./form-options";

// Re-export getSystemSettings from the data layer to avoid duplication
// biome-ignore lint/performance/noBarrelFile: Intentional re-export to centralize implementation
export {
  type GetSystemSettingsResult,
  getSystemSettings,
} from "@/lib/data/system-settings";

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

// TanStack Form server validation - kept for future use if needed
// Currently using manual parsing for better control over FormData transformation
// biome-ignore lint/correctness/noUnusedVariables: Kept for reference
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

/**
 * Parse FormData into properly typed SystemSettings object
 * Handles nested feature flags and boolean conversions
 */
function parseSystemSettingsFormData(
  formData: FormData
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Parse simple fields
  const defaultUserRole = formData.get("default_user_role");
  if (defaultUserRole) {
    data.default_user_role = defaultUserRole;
  }

  // Parse numeric fields
  const maxParticipants = formData.get("max_participants_per_space");
  if (maxParticipants) {
    data.max_participants_per_space = Number.parseInt(
      maxParticipants as string,
      10
    );
  }

  const maxSpacesPerUser = formData.get("max_spaces_per_user");
  if (maxSpacesPerUser) {
    data.max_spaces_per_user = Number.parseInt(maxSpacesPerUser as string, 10);
  }

  const maxTotalSpaces = formData.get("max_total_spaces");
  if (maxTotalSpaces) {
    data.max_total_spaces = Number.parseInt(maxTotalSpaces as string, 10);
  }

  const expirationHours = formData.get("space_expiration_hours");
  if (expirationHours) {
    data.space_expiration_hours = Number.parseInt(
      expirationHours as string,
      10
    );
  }

  // Parse nested features object with proper boolean handling
  // Checkboxes send their value (or nothing) when checked, nothing when unchecked
  data.features = {
    gatekeeper: {
      youtube: {
        enabled: formData.has("features.gatekeeper.youtube.enabled"),
      },
      twitch: {
        enabled: formData.has("features.gatekeeper.twitch.enabled"),
      },
      email: {
        enabled: formData.has("features.gatekeeper.email.enabled"),
      },
    },
  };

  return data;
}

export async function updateSystemSettingsAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Parse FormData into proper object structure
    const parsedData = parseSystemSettingsFormData(formData);

    // Validate the parsed data
    const validation = systemSettingsSchema.safeParse(parsedData);

    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return {
        ...initialFormState,
        errors: validation.error.errors.map((e) => e.message),
      };
    }

    const validatedData = validation.data;

    const supabase = await createClient();

    // Check admin permission
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
