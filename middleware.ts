import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

function createUnauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
    status: 401,
  });
}

function checkBasicAuth(req: NextRequest): NextResponse | null {
  if (process.env.ENABLE_BASIC_AUTH !== "true") {
    return null;
  }

  const basicAuth = req.headers.get("authorization");
  if (!basicAuth) {
    return createUnauthorizedResponse();
  }

  const authValue = basicAuth.split(" ")[1];
  if (!authValue) {
    return createUnauthorizedResponse();
  }

  try {
    const [user, pwd] = atob(authValue).split(":");
    if (
      user !== process.env.BASIC_AUTH_USER ||
      pwd !== process.env.BASIC_AUTH_PASSWORD
    ) {
      return createUnauthorizedResponse();
    }
  } catch {
    return createUnauthorizedResponse();
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- 1. Basic Auth Check (最優先) ---
  const authResponse = checkBasicAuth(req);
  if (authResponse) {
    return authResponse;
  }

  // --- 2. Share Key Rewrite Logic ---
  if (pathname.startsWith("/@")) {
    const shareKey = pathname.slice(2);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );

      const { data, error } = await supabase
        .from("spaces")
        .select("id")
        .eq("share_key", shareKey)
        .single();

      if (error || !data) {
        return NextResponse.redirect(new URL("/404", req.url));
      }

      const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
      const locale =
        cookieLocale && routing.locales.includes(cookieLocale as never)
          ? cookieLocale
          : routing.defaultLocale;

      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/spaces/${data.id}`;
      return NextResponse.rewrite(url);
    } catch (error) {
      console.error("Middleware lookup error:", error);
      return NextResponse.redirect(new URL("/500", req.url));
    }
  }

  // --- 3. i18n Handling (Default) ---
  return handleI18n(req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)", "/@:path*"],
};
