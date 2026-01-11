/**
 * Google Analytics 4 (GA4) の設定を管理するモジュール
 * 環境変数 NEXT_PUBLIC_GA_MEASUREMENT_ID が設定されている場合のみ有効化される
 */

/**
 * GA4測定IDを取得する
 * @returns GA4測定ID、または未設定の場合は undefined
 */
export function getGoogleAnalyticsMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

/**
 * Google Analyticsが有効かどうかを判定する
 * @returns 測定IDが設定されていれば true、そうでなければ false
 */
export function isGoogleAnalyticsEnabled(): boolean {
  const measurementId = getGoogleAnalyticsMeasurementId();
  return typeof measurementId === "string" && measurementId.length > 0;
}
