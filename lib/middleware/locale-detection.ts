import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

export type Locale = (typeof routing.locales)[number];

export function isValidLocale(locale: string): locale is Locale {
  return routing.locales.some((l) => l === locale);
}

export function detectLocaleFromRequest(request: NextRequest): string {
  // Check for NEXT_LOCALE cookie first (set by middleware on previous visits)
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && isValidLocale(cookie)) {
    return cookie;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    // Parse the Accept-Language header (e.g., "ja,en-US;q=0.9,en;q=0.8")
    const languages = acceptLanguage.split(",").map((lang) => {
      const [locale] = lang.trim().split(";");
      return locale.split("-")[0]; // Get the primary language code
    });

    // Find the first matching locale
    for (const lang of languages) {
      if (isValidLocale(lang)) {
        return lang;
      }
    }
  }

  return routing.defaultLocale;
}
