"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { getTranslations } from "next-intl/server";
import { getAdminEmails } from "@/lib/data/profiles";
import { sendContactEmail } from "@/lib/mail";
import { contactFormOpts, contactFormSchema } from "../_lib/form-options";

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(
  token: string | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<{ error?: string; success: boolean }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { error: t("errorTurnstileNotConfigured"), success: false };
  }

  if (!token) {
    return { error: t("errorTurnstileRequired"), success: false };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body: JSON.stringify({
          response: token,
          secret: secretKey,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );

    const data = await response.json();

    if (data.success !== true) {
      return {
        error: t("errorTurnstileVerificationFailed"),
        success: false,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return {
      error: t("errorTurnstileVerificationFailed"),
      success: false,
    };
  }
}

const serverValidate = createServerValidate({
  ...contactFormOpts,
  onServerValidate: contactFormSchema,
});

export async function submitContactFormAction(
  _prevState: unknown,
  formData: FormData
) {
  const t = await getTranslations("ContactForm");

  try {
    // Validate the form data
    const validatedData = await serverValidate(formData);

    // Parse and transform the validated data with Zod
    const parsed = contactFormSchema.parse(validatedData);

    // Check if Turnstile is enabled
    const turnstileEnabled =
      !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      !!process.env.TURNSTILE_SECRET_KEY;

    // Verify Turnstile if enabled
    if (turnstileEnabled) {
      const turnstileToken = formData.get("cf-turnstile-response");
      const verification = await verifyTurnstileToken(
        turnstileToken ? String(turnstileToken) : undefined,
        t
      );

      if (!verification.success) {
        return {
          ...initialFormState,
          errors: [verification.error || t("errorTurnstileVerificationFailed")],
        };
      }
    }

    // Get admin emails from database
    const adminEmailsResult = await getAdminEmails();

    if (adminEmailsResult.error || !adminEmailsResult.data) {
      console.error(
        "Failed to get admin emails:",
        adminEmailsResult.error || "No admin users found"
      );
      return {
        ...initialFormState,
        errors: [t("errorAdminEmailsFailed")],
      };
    }

    // Send email with parsed data
    await sendContactEmail({
      email: parsed.email,
      message: parsed.message,
      name: parsed.name,
      recipients: adminEmailsResult.data,
    });

    // Return success state with user email for redirect
    return {
      ...initialFormState,
      meta: {
        success: true,
        userEmail: parsed.email,
      },
      values: parsed,
    };
  } catch (e) {
    // Check if it's a ServerValidateError from TanStack Form
    if (e && typeof e === "object" && "formState" in e) {
      return (e as { formState: unknown }).formState;
    }

    // Some other error occurred
    console.error("Contact form submission error:", e);
    return {
      ...initialFormState,
      errors: [t("errorGeneric")],
    };
  }
}
