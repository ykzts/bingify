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
 * profiles テーブルから role = 'admin' のユーザーのメールアドレスとロケール情報を取得
 * @returns 管理者のメールアドレスとロケールの配列、またはエラー
 */
export async function getAdminEmails(): Promise<GetAdminEmailsResult> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("profiles")
      .select("email, full_name, locale")
      .eq("role", "admin");

    if (error) {
      console.error("Error fetching admin emails:", error);
      return {
        error: "errorFetchFailed",
      };
    }

    // メールアドレスが null でないものだけを抽出し、AdminEmailInfo 型に変換
    const emails = data
      .filter(
        (
          profile
        ): profile is {
          email: string;
          full_name: string | null;
          locale: string;
        } => profile.email !== null
      )
      .map(
        (profile): AdminEmailInfo => ({
          address: profile.full_name
            ? {
                address: profile.email,
                name: profile.full_name,
              }
            : profile.email,
          locale: profile.locale, // Already NOT NULL in database
        })
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
