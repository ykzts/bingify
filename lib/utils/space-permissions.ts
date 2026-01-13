import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

/**
 * スペースへのowner/admin権限をチェックする内部実装
 * @param supabase - Supabaseクライアント
 * @param spaceId - スペースID
 * @param userId - ユーザーID
 * @returns 権限があればtrue、なければfalse
 */
async function checkSpacePermissionInternal(
  supabase: SupabaseClient<Database>,
  spaceId: string,
  userId: string
): Promise<boolean> {
  // スペース情報を取得
  const { data: space } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", spaceId)
    .single();

  if (!space) {
    return false;
  }

  // オーナーかどうかをチェック
  const isOwner = space.owner_id === userId;

  // 管理者ロールをチェック
  const { data: adminRole } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  const isAdmin = !!adminRole;

  return isOwner || isAdmin;
}

/**
 * スペースへのowner/admin権限をチェックする（既存のSupabaseクライアントを使用）
 * @param supabase - Supabaseクライアント
 * @param spaceId - スペースID
 * @param userId - ユーザーID
 * @returns 権限があればtrue、なければfalse
 */
export function checkSpacePermission(
  supabase: SupabaseClient<Database>,
  spaceId: string,
  userId: string
): Promise<boolean> {
  return checkSpacePermissionInternal(supabase, spaceId, userId);
}

/**
 * スペースへのowner/admin権限をチェックする（新しいSupabaseクライアントを作成）
 * @param spaceId - スペースID
 * @param userId - ユーザーID（undefined の場合は false を返す）
 * @returns 権限があればtrue、なければfalse
 */
export async function checkIsSpaceAdmin(
  spaceId: string,
  userId: string | undefined
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const supabase = await createClient();
  return checkSpacePermissionInternal(supabase, spaceId, userId);
}
