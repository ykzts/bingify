import { createAdminClient } from "@/lib/supabase/admin";

export interface GetAdminEmailsResult {
  data?: string[];
  error?: string;
}

/**
 * RFC 5322 の quoted-string 用に表示名をエスケープ
 * バックスラッシュと二重引用符をエスケープし、制御文字を削除
 */
function escapeDisplayName(name: string): string {
  return (
    name
      // 制御文字 (0x00-0x1F, 0x7F) を削除
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Control characters are intentionally matched and removed for RFC 5322 compliance
      .replace(/[\x00-\x1F\x7F]/g, "")
      // バックスラッシュをエスケープ
      .replace(/\\/g, "\\\\")
      // 二重引用符をエスケープ
      .replace(/"/g, '\\"')
  );
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
          return `"${escapeDisplayName(profile.full_name)}" <${profile.email}>`;
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
