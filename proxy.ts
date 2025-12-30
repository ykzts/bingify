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

type Locale = (typeof routing.locales)[number];

function isValidLocale(locale: string): locale is Locale {
  return routing.locales.some((l) => l === locale);
}

function detectLocaleFromRequest(request: NextRequest): string {
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

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    Boolean(pathname.match(ADMIN_PATTERN))
  );
}

function isDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    Boolean(pathname.match(DASHBOARD_PATTERN))
  );
}

async function handleShareKeyRoute(
  request: NextRequest,
  shareKey: string
): Promise<NextResponse> {
  // Validate share key format
  if (!validateShareKey(shareKey)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    // Detect locale from request (cookie or Accept-Language header)
    const locale = detectLocaleFromRequest(request);

    // Handle the share key rewrite with the detected locale
    const response = await handleShareKeyRewrite(request, shareKey, locale);

    // Set the NEXT_LOCALE cookie to ensure consistent locale handling
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Middleware lookup error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function handleAuthenticatedRoute(
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
    loginUrl.searchParams.set("redirect", pathname);
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
    const localeMatch = pathname.match(LOCALE_PATTERN);
    const homePath = localeMatch ? `/${localeMatch[1]}` : "/";
    const homeUrl = new URL(homePath, request.url);
    return NextResponse.redirect(homeUrl);
  }

  return intlResponse;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- 1. Basic Auth Check (Highest Priority) ---
  const authResponse = checkBasicAuth(request);
  if (authResponse) {
    return authResponse;
  }

  // --- 2. Supabase Auth Check for /dashboard routes ---
  if (isDashboardPath(pathname)) {
    return handleAuthenticatedRoute(request, pathname);
  }

  // --- 3. Admin Auth Check for /admin routes ---
  if (isAdminPath(pathname)) {
    return handleAdminAuth(request, pathname);
  }

  // --- 4. Share Key Rewrite Logic ---
  if (pathname.startsWith("/@")) {
    const shareKey = pathname.slice(2);
    return handleShareKeyRoute(request, shareKey);
  }

  // --- 5. Internationalization Routing ---
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|auth/callback|_next/static|_next/image|favicon.ico).*)"],
};
