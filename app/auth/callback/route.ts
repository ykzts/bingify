import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");
  const origin = requestUrl.origin;

  // Helper function to extract locale from referer
  const getLocaleFromReferer = (): string | null => {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
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
  };

  // Helper function to build path with optional locale
  const buildPath = (path: string, locale: string | null): string => {
    return locale ? `/${locale}${path}` : path;
  };

  // Code parameter is required for authentication
  if (!code || code.trim() === "") {
    console.error("Auth callback called without code parameter");
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Exchange code for session
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Error exchanging code for session:", error);
    const locale = getLocaleFromReferer();
    const loginPath = buildPath("/login?error=auth_failed", locale);
    return NextResponse.redirect(`${origin}${loginPath}`);
  }

  // Successfully authenticated, redirect to specified path or default
  const locale = getLocaleFromReferer();
  
  // Use redirect parameter if provided, otherwise default to homepage
  let redirectPath = redirect && redirect.trim() !== "" ? redirect : "/";
  
  // Ensure the redirect path starts with /
  if (!redirectPath.startsWith("/")) {
    redirectPath = `/${redirectPath}`;
  }
  
  // If redirect path already includes locale, use it as-is
  // Otherwise, prepend locale if available
  const hasLocale = LOCALE_PATTERN.test(redirectPath);
  const finalPath = hasLocale ? redirectPath : buildPath(redirectPath, locale);
  
  return NextResponse.redirect(`${origin}${finalPath}`);
}
