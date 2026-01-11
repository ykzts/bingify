"use server";

import { initialFormState } from "@tanstack/react-form-nextjs";
import { systemSettingsSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";

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

  // Parse space expiration days and hours and convert to hours for database storage
  const spaceExpirationDays = formData.get("space_expiration_days");
  const spaceExpirationHours = formData.get("space_expiration_hours");
  if (spaceExpirationDays !== null || spaceExpirationHours !== null) {
    const days = spaceExpirationDays
      ? Number.parseInt(spaceExpirationDays as string, 10)
      : 0;
    const hours = spaceExpirationHours
      ? Number.parseInt(spaceExpirationHours as string, 10)
      : 0;
    data.space_expiration_hours = days * 24 + hours;
  }

  // Parse archive retention days and convert to hours for database storage
  const archiveRetentionDays = formData.get("archive_retention_days");
  if (archiveRetentionDays) {
    const days = Number.parseInt(archiveRetentionDays as string, 10);
    data.archive_retention_hours = days * 24; // Convert days to hours
  }

  // Parse spaces archive retention days and convert to hours for database storage
  const spacesArchiveRetentionDays = formData.get(
    "spaces_archive_retention_days"
  );
  if (spacesArchiveRetentionDays) {
    const days = Number.parseInt(spacesArchiveRetentionDays as string, 10);
    data.spaces_archive_retention_hours = days * 24; // Convert days to hours
  }

  // Parse nested features object with proper boolean handling
  // Checkboxes send their value (or nothing) when checked, nothing when unchecked
  data.features = {
    gatekeeper: {
      email: {
        enabled: formData.has("features.gatekeeper.email.enabled"),
      },
      twitch: {
        enabled: formData.has("features.gatekeeper.twitch.enabled"),
        follower: {
          enabled: formData.has("features.gatekeeper.twitch.follower.enabled"),
        },
        subscriber: {
          enabled: formData.has(
            "features.gatekeeper.twitch.subscriber.enabled"
          ),
        },
      },
      youtube: {
        enabled: formData.has("features.gatekeeper.youtube.enabled"),
        member: {
          enabled: formData.has("features.gatekeeper.youtube.member.enabled"),
        },
        subscriber: {
          enabled: formData.has(
            "features.gatekeeper.youtube.subscriber.enabled"
          ),
        },
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

    // Return success state with consistent shape
    return {
      ...initialFormState,
      meta: {
        success: true,
      },
      values: validatedData,
    };
  } catch (e) {
    console.error("Error in updateSystemSettingsAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
    };
  }
}
