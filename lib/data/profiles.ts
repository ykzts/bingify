import type Mail from "nodemailer/lib/mailer";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminEmailInfo {
  address: string | Mail.Address;
  locale: string;
}

export interface GetAdminEmailsResult {
  data?: AdminEmailInfo[];
  error?: string;
}

/**
 * profiles テーブルから role = 'admin' のユーザーのメールアドレスと言語設定を取得
 * 言語設定は auth.users.raw_user_meta_data から取得
 * @returns 管理者のメールアドレスと言語設定の配列、またはエラー
 */
export async function getAdminEmails(): Promise<GetAdminEmailsResult> {
  try {
    const adminClient = createAdminClient();

    // Get admin profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "admin");

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      return {
        error: "errorFetchFailed",
      };
    }

    if (!profiles || profiles.length === 0) {
      console.error("No admin users found");
      return {
        error: "errorNoAdmins",
      };
    }

    // Get language preference from auth users for each admin
    const emailsWithLocale = await Promise.all(
      profiles
        .filter(
          (
            profile
          ): profile is {
            id: string;
            email: string;
            full_name: string | null;
          } => profile.email !== null
        )
        .map(async (profile): Promise<AdminEmailInfo | null> => {
          try {
            // Get user data from auth.admin to access raw_user_meta_data
            const { data: userData, error: userError } =
              await adminClient.auth.admin.getUserById(profile.id);

            if (userError || !userData) {
              console.warn(
                `Failed to fetch user data for ${profile.id}:`,
                userError
              );
              // Default to 'ja' if we can't fetch user data
              return {
                address: profile.full_name
                  ? {
                      address: profile.email,
                      name: profile.full_name,
                    }
                  : profile.email,
                locale: "ja",
              };
            }

            // Extract and validate language from user_metadata
            const language = userData.user.user_metadata?.language;
            const validatedLocale =
              language === "en" || language === "ja" ? language : "ja";

            return {
              address: profile.full_name
                ? {
                    address: profile.email,
                    name: profile.full_name,
                  }
                : profile.email,
              locale: validatedLocale,
            };
          } catch (err) {
            console.warn(
              `Exception fetching user data for ${profile.id}:`,
              err
            );
            // Default to 'ja' on exception
            return {
              address: profile.full_name
                ? {
                    address: profile.email,
                    name: profile.full_name,
                  }
                : profile.email,
              locale: "ja",
            };
          }
        })
    );

    // Filter out any null results (shouldn't happen but for safety)
    const emails = emailsWithLocale.filter(
      (email): email is AdminEmailInfo => email !== null
    );

    if (emails.length === 0) {
      console.error("No admin users found with valid email addresses");
      return {
        error: "errorNoAdmins",
      };
    }

    return {
      data: emails,
    };
  } catch (error) {
    console.error("Error in getAdminEmails:", error);
    return {
      error: "errorGeneric",
    };
  }
}
