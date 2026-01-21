"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/utils/create-notification";
import { isValidUUID } from "@/lib/utils/uuid";
import {
  type InviteAdminFormValues,
  inviteAdminFormOpts,
} from "../_lib/form-options";

async function checkUserAuthentication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errorAuthRequired"), user: null };
  }

  return { error: null, user };
}

async function checkSpaceOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    return { error: t("errorSpaceNotFound"), space: null };
  }

  if (space.owner_id !== userId) {
    return { error: t("errorPermissionDenied"), space: null };
  }

  return { error: null, space };
}

async function findUserByEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  const { data: targetUser, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !targetUser) {
    return {
      error: t("errorUserNotFoundByEmail"),
      targetUser: null,
    };
  }

  return { error: null, targetUser };
}

async function checkExistingAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string,
  ownerId: string,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  // Check if user is already the owner
  if (userId === ownerId) {
    return { error: t("errorOwnerCannotBeAdmin") };
  }

  // Check if user is already an admin
  const { data: existingRole } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .single();

  if (existingRole) {
    return { error: t("errorUserAlreadyAdmin") };
  }

  return { error: null };
}

export async function inviteAdminAction(
  spaceId: string,
  _prevState: unknown,
  formData: FormData
) {
  const t = await getTranslations("InviteAdmin");

  try {
    // Create the server validation function
    const serverValidate = createServerValidate({
      ...inviteAdminFormOpts,
      onServerValidate: async ({ value }: { value: InviteAdminFormValues }) => {
        if (!isValidUUID(spaceId)) {
          return { form: t("errorInvalidSpaceId") };
        }

        const supabase = await createClient();

        // Check authentication
        const { error: authError, user } = await checkUserAuthentication(
          supabase,
          t
        );
        if (authError || !user) {
          return { form: authError || t("errorUnauthorized") };
        }

        // Check space ownership
        const { error: ownerError, space } = await checkSpaceOwnership(
          supabase,
          spaceId,
          user.id,
          t
        );
        if (ownerError) {
          return { form: ownerError };
        }
        if (!space) {
          return { form: t("errorPermissionDenied") };
        }

        // Find user by email
        const { error: userError, targetUser } = await findUserByEmail(
          supabase,
          value.email,
          t
        );
        if (userError) {
          return {
            fields: {
              email: userError,
            },
          };
        }
        if (!targetUser) {
          return {
            fields: {
              email: t("errorUserNotFound"),
            },
          };
        }

        // Check if already an admin
        // Note: space.owner_id is guaranteed to exist because checkSpaceOwnership validates it
        const { error: adminError } = await checkExistingAdmin(
          supabase,
          spaceId,
          targetUser.id,
          // biome-ignore lint/style/noNonNullAssertion: owner_id is guaranteed by checkSpaceOwnership validation
          space.owner_id!,
          t
        );
        if (adminError) {
          return {
            fields: {
              email: adminError,
            },
          };
        }

        return undefined;
      },
    });

    // Validate the form data
    const validatedData = await serverValidate(formData);

    // If validation passes, insert the admin role
    const supabase = await createClient();

    // Find user by email (validation already confirmed this exists)
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", validatedData.email)
      .single();

    if (!targetUser) {
      // This should not happen after validation, but handle gracefully
      return {
        ...initialFormState,
        errors: [t("errorUserInfoFailed")],
      };
    }

    // Add user as admin
    const { error: insertError } = await supabase.from("space_roles").insert({
      role: "admin",
      space_id: spaceId,
      user_id: targetUser.id,
    });

    if (insertError) {
      console.error("Database error:", insertError);
      return {
        ...initialFormState,
        errors: [t("errorGeneric")],
      };
    }

    // Get space information for notification
    const { data: spaceData } = await supabase
      .from("spaces")
      .select("title, share_key")
      .eq("id", spaceId)
      .single();

    // Create notification for the invited user
    if (spaceData) {
      const spaceTitle = spaceData.title || spaceData.share_key;
      const linkUrl = `/dashboard/spaces/${spaceId}`;

      // Get locale and translations for notification
      const locale = await getLocale();
      const t = await getTranslations({ locale, namespace: "Notifications" });

      // Get localized notification messages
      const localizedTitle = t("spaceInvitationTitle", {
        spaceName: spaceTitle,
      });
      const localizedContent = t("spaceInvitationContent");

      const notificationResult = await createNotification(
        targetUser.id,
        "space_invitation",
        localizedTitle,
        localizedContent,
        linkUrl,
        {
          space_id: spaceId,
        }
      );

      // Log notification creation failure, but don't block the invitation
      if (!notificationResult.success) {
        console.error(
          "Failed to create notification for invited user:",
          notificationResult.error
        );
      }
    }

    // Return success state
    return {
      ...initialFormState,
      meta: {
        success: true,
      },
      values: { email: "" }, // Reset form
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Error inviting admin:", e);
    return {
      ...initialFormState,
      errors: [t("errorGeneric")],
    };
  }
}
