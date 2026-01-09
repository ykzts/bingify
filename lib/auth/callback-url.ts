import { getAbsoluteUrl } from "@/lib/utils/url";

/**
 * OAuth/Email のコールバックURLを生成する（任意で redirect を付与）
 * @param redirect - 認証後の遷移先（相対パスのみ許可）
 * @returns 認証コールバックの絶対URL
 */
export function buildAuthCallbackUrl(redirect?: string): string {
  const safeRedirect =
    redirect?.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : undefined;
  const params = safeRedirect
    ? `?${new URLSearchParams({ redirect: safeRedirect })}`
    : "";

  return getAbsoluteUrl(`/auth/callback${params}`);
}
