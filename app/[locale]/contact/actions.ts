"use server";

import { z } from "zod";
import { sendContactEmail } from "@/lib/mail";

export interface ContactFormState {
  error?: string;
  errors?: {
    email?: string[];
    message?: string[];
    name?: string[];
    turnstile?: string[];
  };
  success: boolean;
  userEmail?: string;
}

const contactFormSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "本文は10文字以上入力してください"),
  name: z.string().min(1, "名前を入力してください"),
  turnstileToken: z.string().optional(),
});

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Turnstile secret key is not configured");
  }

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
  return data.success === true;
}

/**
 * Submit contact form
 */
export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  try {
    // Extract form data
    const rawData = {
      email: formData.get("email"),
      message: formData.get("message"),
      name: formData.get("name"),
      turnstileToken: formData.get("cf-turnstile-response"),
    };

    // Validate form data
    const validation = contactFormSchema.safeParse(rawData);

    if (!validation.success) {
      return {
        errors: validation.error.flatten().fieldErrors,
        success: false,
      };
    }

    const { email, message, name, turnstileToken } = validation.data;

    // Check if Turnstile is enabled
    const turnstileEnabled =
      !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      !!process.env.TURNSTILE_SECRET_KEY;

    // Verify Turnstile token if enabled
    if (turnstileEnabled) {
      if (!turnstileToken) {
        return {
          errors: {
            turnstile: ["スパム対策の検証が必要です"],
          },
          success: false,
        };
      }

      const isValid = await verifyTurnstileToken(turnstileToken);
      if (!isValid) {
        return {
          errors: {
            turnstile: [
              "スパム対策の検証に失敗しました。もう一度お試しください",
            ],
          },
          success: false,
        };
      }
    }

    // Send email
    await sendContactEmail({ email, message, name });

    return {
      success: true,
      userEmail: email,
    };
  } catch (error) {
    console.error("Contact form submission error:", error);
    return {
      error:
        "送信中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      success: false,
    };
  }
}
