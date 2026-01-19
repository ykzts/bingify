"use server";

import { render } from "@react-email/render";
import { initialFormState } from "@tanstack/react-form-nextjs";
import React from "react";
import { ContactFormEmail } from "@/emails/contact-form-email";
import { smtpSettingsSchema } from "@/lib/schemas/smtp-settings";
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
 * Parse FormData into properly typed SmtpSettings object
 */
function parseSmtpSettingsFormData(
  formData: FormData
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Parse string fields
  const smtpHost = formData.get("smtp_host");
  if (smtpHost) {
    data.smtp_host = smtpHost as string;
  }

  const smtpUser = formData.get("smtp_user");
  if (smtpUser) {
    data.smtp_user = smtpUser as string;
  }

  const smtpPassword = formData.get("smtp_password");
  if (smtpPassword) {
    data.smtp_password = smtpPassword as string;
  }

  const mailFrom = formData.get("mail_from");
  if (mailFrom) {
    data.mail_from = mailFrom as string;
  }

  // Parse numeric port field
  const smtpPort = formData.get("smtp_port");
  if (smtpPort) {
    data.smtp_port = Number.parseInt(smtpPort as string, 10);
  }

  // Parse boolean secure field
  const smtpSecure = formData.get("smtp_secure");
  data.smtp_secure = smtpSecure === "true" || smtpSecure === "on";

  return data;
}

export async function updateSmtpSettingsAction(
  _prevState: unknown,
  formData: FormData
) {
  try {
    // Parse FormData into proper object structure
    const parsedData = parseSmtpSettingsFormData(formData);

    // Validate the parsed data
    const validation = smtpSettingsSchema.safeParse(parsedData);

    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      return {
        ...initialFormState,
        errors: validation.error.issues.map((e) => e.message),
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

    // Call RPC to upsert SMTP settings
    const { data, error } = await supabase.rpc("upsert_smtp_settings", {
      p_mail_from: validatedData.mail_from,
      p_smtp_host: validatedData.smtp_host,
      p_smtp_port: validatedData.smtp_port,
      p_smtp_secure: validatedData.smtp_secure,
      p_smtp_user: validatedData.smtp_user,
      p_smtp_password: validatedData.smtp_password || undefined,
    });

    if (error) {
      console.error("Error updating SMTP settings:", error);
      return {
        ...initialFormState,
        errors: ["errorUpdateFailed"],
      };
    }

    // Check if RPC returned success
    if (
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      !data.success
    ) {
      console.error("RPC error:", data);
      return {
        ...initialFormState,
        errors: [
          typeof data === "object" && "error" in data
            ? (data.error as string)
            : "errorUpdateFailed",
        ],
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
    console.error("Error in updateSmtpSettingsAction:", e);
    return {
      ...initialFormState,
      errors: ["errorGeneric"],
    };
  }
}

export async function deleteSmtpSettingsAction() {
  try {
    const supabase = await createClient();

    // Check admin permission
    const { error: permissionError } = await checkAdminPermission(supabase);
    if (permissionError) {
      return {
        error: permissionError,
        success: false,
      };
    }

    // Call RPC to delete SMTP settings
    const { data, error } = await supabase.rpc("delete_smtp_settings");

    if (error) {
      console.error("Error deleting SMTP settings:", error);
      return {
        error: "errorDeleteFailed",
        success: false,
      };
    }

    // Check if RPC returned success
    if (
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      !data.success
    ) {
      console.error("RPC error:", data);
      return {
        error:
          typeof data === "object" && "error" in data
            ? (data.error as string)
            : "errorDeleteFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (e) {
    console.error("Error in deleteSmtpSettingsAction:", e);
    return {
      error: "errorGeneric",
      success: false,
    };
  }
}

/**
 * Send a test email to verify SMTP settings
 */
export async function sendTestEmailAction(testEmailAddress: string) {
  try {
    if (!testEmailAddress) {
      return {
        error: "errorNoTestEmail",
        success: false,
      };
    }

    const supabase = await createClient();

    // Check admin permission
    const { error: permissionError, user } =
      await checkAdminPermission(supabase);
    if (permissionError) {
      return {
        error: permissionError,
        success: false,
      };
    }

    // Get SMTP settings to use for sending test email
    const { data: settingsData, error: settingsError } =
      await supabase.rpc("get_smtp_settings");

    if (settingsError) {
      console.error("Error fetching SMTP settings:", settingsError);
      return {
        error: "errorFetchFailed",
        success: false,
      };
    }

    if (
      !settingsData ||
      typeof settingsData !== "object" ||
      !("settings" in settingsData)
    ) {
      return {
        error: "errorNoSettings",
        success: false,
      };
    }

    const settings = settingsData.settings as {
      mail_from: string;
      smtp_host: string;
      smtp_password: string | null;
      smtp_port: number;
      smtp_secure: boolean;
      smtp_user: string;
    } | null;

    if (!settings) {
      return {
        error: "errorNoSettings",
        success: false,
      };
    }

    // Import nodemailer dynamically to avoid bundling issues
    const nodemailer = await import("nodemailer");

    // Get user's locale preference
    const emailLocale =
      (user?.user_metadata?.locale as string) ||
      (user?.user_metadata?.preferred_language as string) ||
      "en";

    // Create test transporter
    const transporter = nodemailer.default.createTransport({
      auth: {
        pass: settings.smtp_password || undefined,
        user: settings.smtp_user,
      },
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
    });

    // Generate test email content
    const emailHtml = await render(
      React.createElement(ContactFormEmail, {
        email: testEmailAddress,
        locale: emailLocale,
        message:
          "This is a test email from your Bingify SMTP configuration. If you received this email, your SMTP settings are working correctly!",
        name: "SMTP Test",
      })
    );

    // Send test email
    await transporter.sendMail({
      from: settings.mail_from,
      html: emailHtml,
      subject: "SMTP Test Email from Bingify",
      to: testEmailAddress,
    });

    return {
      success: true,
    };
  } catch (e) {
    console.error("Error in sendTestEmailAction:", e);
    return {
      error: "errorSendFailed",
      success: false,
    };
  }
}
