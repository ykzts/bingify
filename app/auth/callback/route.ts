import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);

function extractLocaleFromReferer(referer: string | null): string | null {
  if (!referer) {
    return null;
  }

  const refererUrl = new URL(referer);
  const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);
  return localeMatch ? localeMatch[1] : null;
}

function sanitizeRedirectPath(redirectTo: string | null): string | null {
  if (!redirectTo) {
    return null;
  }

  // Only allow relative paths on the current origin (e.g. "/foo" but not "//evil.com")
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  return redirectTo;
}

function buildRedirectUrl(
  origin: string,
  redirectTo: string | null,
  referer: string | null
): string {
  const safeRedirectTo = sanitizeRedirectPath(redirectTo);

  // Handle redirectTo parameter
  if (safeRedirectTo) {
    const locale = extractLocaleFromReferer(referer) || routing.defaultLocale;
    const hasLocale = LOCALE_PATTERN.test(safeRedirectTo);
    const finalRedirect = hasLocale
      ? safeRedirectTo
      : `/${locale}${safeRedirectTo}`;
    return `${origin}${finalRedirect}`;
  }

  // Default to dashboard
  const locale = extractLocaleFromReferer(referer);
  const redirectPath = locale ? `/${locale}/dashboard` : "/dashboard";
  return `${origin}${redirectPath}`;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo");
  const origin = requestUrl.origin;
  const referer = request.headers.get("referer");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      const locale = extractLocaleFromReferer(referer);
      const loginPath = locale
        ? `/${locale}/login?error=auth_failed`
        : "/login?error=auth_failed";
      return NextResponse.redirect(`${origin}${loginPath}`);
    }
  }

  const redirectUrl = buildRedirectUrl(origin, redirectTo, referer);
  return NextResponse.redirect(redirectUrl);
}
