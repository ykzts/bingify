"use server";

import {
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { sendContactEmail } from "@/lib/mail";
import { contactFormOpts, contactFormSchema } from "./form-options";

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(
  token: string | undefined
): Promise<{ error?: string; success: boolean }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return { error: "Turnstile secret key is not configured", success: false };
  }

  if (!token) {
    return { error: "スパム対策の検証が必要です", success: false };
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
        error: "スパム対策の検証に失敗しました。もう一度お試しください",
        success: false,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return {
      error: "スパム対策の検証に失敗しました。もう一度お試しください",
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
        turnstileToken ? String(turnstileToken) : undefined
      );

      if (!verification.success) {
        return {
          ...initialFormState,
          errors: [verification.error || "スパム対策の検証に失敗しました"],
        };
      }
    }

    // Send email with parsed data
    await sendContactEmail({
      email: parsed.email,
      message: parsed.message,
      name: parsed.name,
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
      errors: [
        "送信中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      ],
    };
  }
}
