/**
 * ユーザー名が有効かどうかをチェックする
 * @param fullName - チェックする名前
 * @returns 名前が有効かどうか
 */
export function isValidUserName(fullName: string | null | undefined): boolean {
  return fullName !== null && fullName !== undefined && fullName.trim() !== "";
}
