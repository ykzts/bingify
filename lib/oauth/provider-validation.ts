import type { OAuthProvider } from "./token-storage";

/**
 * サポートされているOAuthプロバイダーかどうかを型安全に検証する
 *
 * @param provider - 検証対象のプロバイダー名
 * @returns プロバイダーがサポートされている場合はtrue
 */
export function isValidOAuthProvider(
  provider: unknown
): provider is OAuthProvider {
  return provider === "google" || provider === "twitch";
}
