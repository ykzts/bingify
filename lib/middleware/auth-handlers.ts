import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/middleware";
import { extractLocaleFromPath } from "./path-matchers";

const intlMiddleware = createIntlMiddleware(routing);

export async function handleAuthenticatedRoute(
  request: NextRequest,
  pathname: string
): Promise<NextResponse> {
  // Run intl middleware first to handle locale detection
  const intlResponse = intlMiddleware(request);
  const supabase = createClient(request, intlResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Extract locale from pathname if present; default to unprefixed login
    const locale = extractLocaleFromPath(pathname);
    const loginPath = locale ? `/${locale}/login` : "/login";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

export async function handleAdminAuth(
  request: NextRequest,
  pathname: string
): Promise<NextResponse> {
  // Run intl middleware first to handle locale detection
  const intlResponse = intlMiddleware(request);
  const supabase = createClient(request, intlResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login if not authenticated
    const locale = extractLocaleFromPath(pathname);
    const loginPath = locale ? `/${locale}/login` : "/login";
    const loginUrl = new URL(loginPath, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for admin check:", profileError);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  if (!profile || profile.role !== "admin") {
    // Redirect to home if not admin
    const locale = extractLocaleFromPath(pathname);
    const homePath = locale ? `/${locale}` : "/";
    const homeUrl = new URL(homePath, request.url);
    return NextResponse.redirect(homeUrl);
  }

  return intlResponse;
}
