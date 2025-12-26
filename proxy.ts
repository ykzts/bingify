import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
      const response = await handleShareKeyRewrite(request, shareKey);
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
