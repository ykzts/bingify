/**
 * スペースのステータス型
 */
export type SpaceStatus = "active" | "draft" | "closed";

/**
 * ステータスから翻訳キーへのマッピング
 */
const STATUS_TRANSLATION_KEYS = {
  AdminSpace: {
    active: "settingsStatusActive",
    closed: "settingsStatusClosed",
    draft: "settingsStatusDraft",
  },
  Dashboard: {
    active: "statusActive",
    closed: "statusClosed",
    draft: "statusDraft",
  },
} as const;

/**
 * スペースのステータスを翻訳キーにマッピングする
 * @param status - スペースのステータス ("active" | "draft" | "closed" | null)
 * @param namespace - 翻訳の名前空間 ("Dashboard" | "AdminSpace")
 * @returns 翻訳キー
 */
export function getSpaceStatusTranslationKey(
  status: SpaceStatus | null,
  namespace: "Dashboard" | "AdminSpace" = "Dashboard"
): string {
  const normalizedStatus: SpaceStatus = status || "closed";
  return STATUS_TRANSLATION_KEYS[namespace][normalizedStatus];
}
