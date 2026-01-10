/**
 * Intl.DateTimeFormat を使用した日時フォーマットユーティリティ
 */

/**
 * ロケールに応じた日付フォーマット（長形式）
 * 例: "Jan 10, 2024" (en), "2024年1月10日" (ja)
 */
export function formatDate(
  date: Date | string | number,
  locale: string
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
}

/**
 * ロケールに応じた日付フォーマット（短形式）
 * 例: "Jan 10, 2024" (en), "2024/1/10" (ja)
 */
export function formatDateShort(
  date: Date | string | number,
  locale: string
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: locale === "ja" ? "numeric" : "short",
    year: "numeric",
  }).format(dateObj);
}

/**
 * ロケールに応じた日時フォーマット（日時）
 * 例: "Jan 10, 2024, 3:45:30 PM" (en), "2024/1/10 15:45:30" (ja)
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    month: locale === "ja" ? "numeric" : "short",
    second: "numeric",
    year: "numeric",
  }).format(dateObj);
}

/**
 * yyyyMMdd 形式の日付サフィックスを生成
 * 共有キーのサフィックスに使用
 * 例: "20240110"
 */
export function formatDateSuffix(
  date: Date | string | number = new Date()
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  if (Number.isNaN(dateObj.getTime())) {
    return "";
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}
