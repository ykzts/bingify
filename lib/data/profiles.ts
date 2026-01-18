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
 * @returns 管理者のメールアドレスと言語設定の配列、またはエラー
 */
export async function getAdminEmails(): Promise<GetAdminEmailsResult> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("profiles")
      .select("email, full_name, language")
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
          language: string;
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
          locale: profile.language, // NOT NULL in database schema with default 'ja', synced from user_metadata
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
