import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { checkBasicAuth } from "./lib/auth/basic-auth";
import {
  handleShareKeyRewrite,
  validateShareKey,
} from "./lib/middleware/share-key";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- 1. Basic Auth Check (Highest Priority) ---
  const authResponse = checkBasicAuth(request);
  if (authResponse) {
    return authResponse;
  }

  // --- 2. Share Key Rewrite Logic ---
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

  // --- 3. Internationalization Routing ---
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
