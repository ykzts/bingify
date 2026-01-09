"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { emailChangeSchema, usernameSchema } from "@/lib/schemas/user";
import { createClient } from "@/lib/supabase/server";
import { getAbsoluteUrl } from "@/lib/utils/url";
import {
  type EmailChangeFormValues,
  emailChangeFormOpts,
  type UsernameFormValues,
  usernameFormOpts,
} from "../_lib/form-options";

export interface UnlinkIdentityState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export async function unlinkIdentity(
  provider: string
): Promise<UnlinkIdentityState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    const identities = user.identities || [];

    if (identities.length <= 1) {
      return {
        errorKey: "errorMinimumIdentity",
        success: false,
      };
    }

    const identity = identities.find((id) => id.provider === provider);

    if (!identity) {
      return {
        errorKey: "errorProviderNotLinked",
        success: false,
      };
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      console.error("Unlink identity error:", error);
      return {
        errorKey: "errorUnlinkFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error unlinking identity:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}

export type UsernameErrorKey =
  | "errorUsernameRequired"
  | "errorUsernameTooLong"
  | "errorInvalidUsername"
  | "errorUnauthorized"
  | "errorUpdateFailed"
  | "errorGeneric";

export interface UpdateUsernameState {
  error?: string;
  errorKey?: UsernameErrorKey;
  success: boolean;
}

// Create the server validation function
const serverValidate = createServerValidate({
  ...usernameFormOpts,
  onServerValidate: async ({ value }: { value: UsernameFormValues }) => {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { form: "errorUnauthorized" };
    }

    // Validate username with Zod schema
    const validation = usernameSchema.safeParse({ username: value.username });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      // Map Zod error codes to i18n keys
      if (issue.code === "too_small") {
        return { fields: { username: "errorUsernameRequired" } };
      }
      if (issue.code === "too_big") {
        return { fields: { username: "errorUsernameTooLong" } };
      }
      return { fields: { username: "errorInvalidUsername" } };
    }

    return undefined;
  },
});

export async function updateUsernameAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Validate the form data
    const validatedData = await serverValidate(formData);

    const supabase = await createClient();

    // Double check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...initialFormState,
        errors: ["errorUnauthorized"],
      };
    }

    // Update the username in the database
    // Note: Currently using full_name to store username as the schema
    // lacks a dedicated username column. TODO: Add username column and migrate data.
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validatedData.username,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update username error:", error);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
      };
    }

    // Invalidate the profile settings page cache
    revalidatePath("/settings/profile");

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
    console.error("Error updating username:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
    };
  }
}

// Keep the old function for backward compatibility during migration
export async function updateUsername(
  _prevState: UpdateUsernameState,
  formData: FormData
): Promise<UpdateUsernameState> {
  try {
    const username = formData.get("username");
    if (typeof username !== "string") {
      return {
        errorKey: "errorUsernameRequired",
        success: false,
      };
    }

    const validation = usernameSchema.safeParse({ username });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      // Map Zod error codes to i18n keys
      if (issue.code === "too_small") {
        return {
          errorKey: "errorUsernameRequired",
          success: false,
        };
      }
      if (issue.code === "too_big") {
        return {
          errorKey: "errorUsernameTooLong",
          success: false,
        };
      }
      return {
        errorKey: "errorInvalidUsername",
        success: false,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validation.data.username,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update username error:", error);
      return {
        errorKey: "errorUpdateFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating username:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}

// Email change server validation
const emailChangeServerValidate = createServerValidate({
  ...emailChangeFormOpts,
  onServerValidate: async ({ value }: { value: EmailChangeFormValues }) => {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { form: "errorUnauthorized" };
    }

    // Validate email with Zod schema
    const validation = emailChangeSchema.safeParse({ email: value.email });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      // Map Zod error codes to i18n keys
      if (issue.code === "invalid_type" || issue.code === "too_small") {
        return { fields: { email: "errorEmailRequired" } };
      }
      if (issue.code === "too_big") {
        return { fields: { email: "errorEmailTooLong" } };
      }
      // All other validation errors (including invalid email format)
      return { fields: { email: "errorEmailInvalid" } };
    }

    // Check if the email is the same as the current email
    if (user.email?.toLowerCase() === validation.data.email.toLowerCase()) {
      return { fields: { email: "errorSameEmail" } };
    }

    return undefined;
  },
});

export async function changeEmailAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Validate the form data
    const validatedData = await emailChangeServerValidate(formData);

    const supabase = await createClient();
    const locale = await getLocale();

    // Double check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...initialFormState,
        errors: ["errorUnauthorized"],
      };
    }

    // Request email change - Supabase will send confirmation emails
    const { error } = await supabase.auth.updateUser(
      {
        email: validatedData.email,
      },
      {
        emailRedirectTo: getAbsoluteUrl(
          getPathname({
            href: "/settings/profile",
            locale,
          })
        ),
      }
    );

    if (error) {
      console.error("Email change error:", error);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
      };
    }

    // Invalidate the profile settings page cache
    await revalidatePath(getPathname({ href: "/settings/profile", locale }));

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
    console.error("Error changing email:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
    };
  }
}
