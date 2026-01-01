"use server";

export type { GetSystemSettingsResult } from "@/lib/data/system-settings";
export { getSystemSettings } from "@/lib/data/system-settings";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { systemSettingsSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import {
  type SystemSettings,
  systemFeaturesSchema,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import { systemSettingsFormOpts } from "./form-options";
    
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
