import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { checkBasicAuth } from "./lib/auth/basic-auth";
import {
  handleAdminAuth,
  handleAuthenticatedRoute,
} from "./lib/middleware/auth-handlers";
import { isAdminPath, isDashboardPath } from "./lib/middleware/path-matchers";
import { handleShareKeyRoute } from "./lib/middleware/share-key";

const intlMiddleware = createIntlMiddleware(routing);

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
  matcher: [
    "/((?!api|auth/callback|_next/static|_next/image|favicon.ico|favicon.svg|logo.svg).*)",
  ],
};
