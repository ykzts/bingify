import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      // Extract locale from referer for error redirect
      const referer = request.headers.get("referer");
      let loginPath = "/login?error=auth_failed";

      if (referer) {
        const refererUrl = new URL(referer);
        const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);
        if (localeMatch) {
          loginPath = `/${localeMatch[1]}/login?error=auth_failed`;
        }
      }

      return NextResponse.redirect(`${origin}${loginPath}`);
    }
  }

  // Extract locale from referer or default to root dashboard
  const referer = request.headers.get("referer");
  let redirectPath = "/dashboard";

  if (referer) {
    const refererUrl = new URL(referer);
    const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);
    if (localeMatch) {
      redirectPath = `/${localeMatch[1]}/dashboard`;
    }
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
