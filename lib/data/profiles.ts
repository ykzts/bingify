import { createAdminClient } from "@/lib/supabase/admin";

export interface GetAdminEmailsResult {
  data?: string[];
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

    // メールアドレスが null でないものだけを抽出し、フォーマットする
    const emails = data
      .filter(
        (profile): profile is { email: string; full_name: string | null } =>
          profile.email !== null
      )
      .map((profile) => {
        // full_name がある場合は "Full Name" <email@example.com> 形式にする
        if (profile.full_name) {
          return `"${profile.full_name}" <${profile.email}>`;
        }
        return profile.email;
      });

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
