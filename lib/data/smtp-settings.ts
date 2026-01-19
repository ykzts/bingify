import { createClient } from "@/lib/supabase/server";

export interface SmtpSettingsData {
  created_at: string;
  mail_from: string;
  smtp_host: string;
  smtp_password: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  updated_at: string;
}

export interface GetSmtpSettingsResult {
  error?: string;
  settings?: SmtpSettingsData | null;
}

/**
 * Get SMTP settings from database
 * Returns null if no settings are configured
 */
export async function getSmtpSettings(): Promise<GetSmtpSettingsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_smtp_settings");

    if (error) {
      console.error("Error fetching SMTP settings:", error);
      return {
        error: "Failed to fetch SMTP settings",
      };
    }

    if (!data) {
      return {
        error: "No response from database",
      };
    }

    // Check if the RPC returned an error
    if (typeof data === "object" && "success" in data && !data.success) {
      console.error("RPC error:", data.error);
      return {
        error: data.error as string,
      };
    }

    // Extract settings from RPC response
    const settings =
      typeof data === "object" && "settings" in data
        ? (data.settings as SmtpSettingsData | null)
        : null;

    return {
      settings,
    };
  } catch (error) {
    console.error("Error in getSmtpSettings:", error);
    return {
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get SMTP settings or fallback to environment variables
 * This is used by the mail sending logic
 */
export async function getSmtpSettingsOrEnv(): Promise<{
  auth: { pass: string | undefined; user: string | undefined };
  from: string | undefined;
  host: string | undefined;
  port: number;
  secure: boolean;
}> {
  // Try to get settings from database first
  const { settings, error } = await getSmtpSettings();

  // If database settings exist and are valid, use them
  if (settings && !error) {
    return {
      auth: {
        pass: settings.smtp_password ?? undefined,
        user: settings.smtp_user,
      },
      from: settings.mail_from,
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
    };
  }

  // Fallback to environment variables
  return {
    auth: {
      pass: process.env.SMTP_PASS,
      user: process.env.SMTP_USER,
    },
    from: process.env.MAIL_FROM,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
  };
}
