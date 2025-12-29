import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);
const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const DANGEROUS_PROTOCOLS = /(?:javascript|data|vbscript|file|about):/i;

// Helper function to validate and sanitize redirect path
function validateRedirectPath(redirect: string | null, origin: string): string {
  let redirectPath = redirect && redirect.trim() !== "" ? redirect : "/";

  // Decode URI component to handle encoded characters
  try {
    redirectPath = decodeURIComponent(redirectPath);
  } catch {
    return "/";
  }

  // Check for path traversal patterns before normalization
  if (redirectPath.includes("..")) {
    return "/";
  }

  // Validate redirect path to prevent open redirect vulnerabilities
  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return "/";
  }

  // Check for protocol schemes at the start
  if (PROTOCOL_PATTERN.test(redirectPath)) {
    return "/";
  }

  // Check for dangerous protocol handlers anywhere in the path
  if (DANGEROUS_PROTOCOLS.test(redirectPath)) {
    return "/";
  }

  // Normalize and validate using URL constructor
  try {
    const testUrl = new URL(redirectPath, origin);

    // Verify origin matches and protocol is safe
    if (
      testUrl.origin !== origin ||
      (testUrl.protocol !== "http:" && testUrl.protocol !== "https:")
    ) {
      return "/";
    }

    // Use the normalized pathname from the URL object
    return testUrl.pathname + testUrl.search + testUrl.hash;
  } catch {
    return "/";
  }
}

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
  const redirectPath = validateRedirectPath(redirect, origin);

  // If redirect path already includes locale, use it as-is
  // Otherwise, prepend locale if available
  const hasLocale = LOCALE_PATTERN.test(redirectPath);
  const finalPath = hasLocale ? redirectPath : buildPath(redirectPath, locale);

  return NextResponse.redirect(`${origin}${finalPath}`);
}
