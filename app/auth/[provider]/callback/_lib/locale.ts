import { routing } from "@/i18n/routing";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);

/**
 * Extracts locale from HTTP referer header
 * @param refererHeader - The referer header value from the request
 * @returns The validated locale string or null if not found/invalid
 */
export function getLocaleFromReferer(
  refererHeader: string | null
): string | null {
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);
      const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);
      if (localeMatch?.[1]) {
        const locale = localeMatch[1];
        // Validate locale against configured locales
        if (
          routing.locales.includes(locale as (typeof routing.locales)[number])
        ) {
          return locale;
        }
      }
    } catch {
      // Invalid URL in referer header, return null
      return null;
    }
  }
  return null;
}

/**
 * Builds a path with optional locale prefix
 * @param path - The path to build (e.g., "/login")
 * @param locale - Optional locale to prefix the path with
 * @returns The path with locale prefix if provided, otherwise the original path
 */
export function buildPath(path: string, locale: string | null): string {
  return locale ? `/${locale}${path}` : path;
}
