import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOCALE_PATTERN = /^\/(en|ja)\//;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // Extract locale from referer or default to root dashboard
  const referer = request.headers.get("referer");
  let redirectPath = "/dashboard";

  if (referer) {
    const refererUrl = new URL(referer);
    const localeMatch = refererUrl.pathname.match(LOCALE_PATTERN);    if (localeMatch) {
      redirectPath = `/${localeMatch[1]}/dashboard`;
    }
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
