/**
 * スペースのステータスを翻訳キーにマッピングする
 * @param status - スペースのステータス ("active" | "draft" | "closed" | null)
 * @param namespace - 翻訳の名前空間 ("Dashboard" | "AdminSpace")
 * @returns 翻訳キー
 */
export function getSpaceStatusTranslationKey(
  status: string | null,
  namespace: "Dashboard" | "AdminSpace" = "Dashboard"
): string {
  if (namespace === "AdminSpace") {
    // AdminSpace 名前空間用のキー（設定シートで使用）
    if (status === "active") {
      return "settingsStatusActive";
    }
    if (status === "draft") {
      return "settingsStatusDraft";
    }
    return "settingsStatusClosed";
  }

  // Dashboard 名前空間用のキー（スペース一覧で使用）
  if (status === "active") {
    return "statusActive";
  }
  if (status === "draft") {
    return "statusDraft";
  }
  return "statusClosed";
}
