import type Mail from "nodemailer/lib/mailer";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GetAdminEmailsResult {
  data?: Mail.Address[];
  error?: string;
}

/**
 * profiles テーブルから role = 'admin' のユーザーのメールアドレスを取得
 * @returns 管理者のメールアドレス配列、またはエラー
 */
export async function getAdminEmails(): Promise<GetAdminEmailsResult> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin");

    if (error) {
      console.error("Error fetching admin emails:", error);
      return {
        error: "errorFetchFailed",
      };
    }

    // メールアドレスが null でないものだけを抽出し、Address オブジェクトに変換
    const emails = data
      .filter(
        (profile): profile is { email: string; full_name: string | null } =>
          profile.email !== null
      )
      .map((profile) => ({
        address: profile.email,
        name: profile.full_name || undefined,
      }));

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
