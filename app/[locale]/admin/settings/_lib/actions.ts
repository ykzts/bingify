"use server";

import { systemSettingsSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";

// Define initial state for the action
export const actionInitialState = {
  errors: [] as string[],
  // biome-ignore lint/suspicious/noExplicitAny: Type is determined at runtime by form values
  values: undefined as any,
  errorMap: {} as Record<string, string>,
};

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
        ...actionInitialState,
        errors: validation.error.issues.map(
          (e: { message: string }) => e.message
        ),
      };
    }

    const validatedData = validation.data;

    const supabase = await createClient();

    // Check admin permission
    const { error: permissionError } = await checkAdminPermission(supabase);
    if (permissionError) {
      return {
        ...actionInitialState,
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
        ...actionInitialState,
        errors: ["errorUpdateFailed"],
      };
    }

    // Return success state with consistent shape
    return {
      ...actionInitialState,
      values: validatedData,
      meta: {
        success: true,
      },
    };
  } catch (e) {
    console.error("Error in updateSystemSettingsAction:", e);
    return {
      ...actionInitialState,
      errors: ["errorGeneric"],
    };
  }
}
