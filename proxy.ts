import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { checkBasicAuth } from "./lib/auth/basic-auth";
import {
  handleShareKeyRewrite,
  validateShareKey,
} from "./lib/middleware/share-key";
import { createClient } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);
const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);
const DASHBOARD_PATTERN = new RegExp(
  `^/(${routing.locales.join("|")})/dashboard(/|$)`
);
const ADMIN_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/admin(/|$)`);

function isDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    Boolean(pathname.match(DASHBOARD_PATTERN))
  );
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    Boolean(pathname.match(ADMIN_PATTERN))
  );
}

async function handleDashboardAuth(
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
    const localeMatch = pathname.match(LOCALE_PATTERN);
    const loginPath = localeMatch ? `/${localeMatch[1]}/login` : "/login";
    const loginUrl = new URL(loginPath, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

async function handleAdminAuth(
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
    const localeMatch = pathname.match(LOCALE_PATTERN);
    const loginPath = localeMatch ? `/${localeMatch[1]}/login` : "/login";
    const loginUrl = new URL(loginPath, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    // Redirect to home if not admin
    const localeMatch = pathname.match(LOCALE_PATTERN);
    const homePath = localeMatch ? `/${localeMatch[1]}` : "/";
    const homeUrl = new URL(homePath, request.url);
    return NextResponse.redirect(homeUrl);
  }

  return intlResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- 1. Basic Auth Check (Highest Priority) ---
  const authResponse = checkBasicAuth(request);
  if (authResponse) {
    return authResponse;
  }

  // --- 2. Supabase Auth Check for /dashboard routes ---
  if (isDashboardPath(pathname)) {
    return handleDashboardAuth(request, pathname);
  }

  // --- 3. Admin Auth Check for /admin routes ---
  if (isAdminPath(pathname)) {
    return handleAdminAuth(request, pathname);
  }

  // --- 4. Share Key Rewrite Logic ---
  if (pathname.startsWith("/@")) {
    const shareKey = pathname.slice(2);

    // Validate share key format
    if (!validateShareKey(shareKey)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    try {
      // Run intl middleware first to detect locale and set headers/cookies
      const intlResponse = intlMiddleware(request);

      // Get the locale from the intl middleware response
      const locale =
        intlResponse.cookies.get("NEXT_LOCALE")?.value || routing.defaultLocale;

      // Now handle the share key rewrite with the detected locale
      const response = await handleShareKeyRewrite(request, shareKey, locale);

      // Copy locale cookie from intl response to our rewrite response
      const localeCookie = intlResponse.cookies.get("NEXT_LOCALE");
      if (localeCookie) {
        response.cookies.set("NEXT_LOCALE", localeCookie.value, {
          path: "/",
          sameSite: "lax",
        });
      }

      return response;
    } catch (error) {
      console.error("Middleware lookup error:", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }

  // --- 5. Internationalization Routing ---
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
