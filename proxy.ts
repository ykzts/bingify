import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHARE_KEY_REGEX = /^[a-zA-Z0-9-]+$/;

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

  // Validate required environment variables
  if (!(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD)) {
    console.error(
      "BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set when ENABLE_BASIC_AUTH is true"
    );
    return createUnauthorizedResponse();
  }

  const basicAuth = req.headers.get("authorization");
  if (!basicAuth) {
    return createUnauthorizedResponse();
  }

  const parts = basicAuth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Basic") {
    return createUnauthorizedResponse();
  }

  const authValue = parts[1];
  if (!authValue) {
    return createUnauthorizedResponse();
  }

  try {
    const decodedAuth = atob(authValue);
    const colonIndex = decodedAuth.indexOf(":");

    if (colonIndex === -1) {
      return createUnauthorizedResponse();
    }

    const user = decodedAuth.substring(0, colonIndex);
    const pwd = decodedAuth.substring(colonIndex + 1);

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

async function handleShareKeyRewrite(
  request: NextRequest,
  shareKey: string
): Promise<NextResponse> {
  // Validate required Supabase credentials
  if (
    !(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  ) {
    console.error("Supabase credentials are not configured");
    return NextResponse.redirect(new URL("/500", request.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from("spaces")
    .select("id")
    .eq("share_key", shareKey)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/404", request.url));
  }

  // Validate UUID format for security
  if (!UUID_REGEX.test(data.id)) {
    console.error("Invalid UUID format:", data.id);
    return NextResponse.redirect(new URL("/404", request.url));
  }

  const url = request.nextUrl.clone();
  url.pathname = `/spaces/${data.id}`;
  return NextResponse.rewrite(url);
}

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
    if (!(shareKey && SHARE_KEY_REGEX.test(shareKey))) {
      return NextResponse.redirect(new URL("/404", request.url));
    }

    try {
      return await handleShareKeyRewrite(request, shareKey);
    } catch (error) {
      console.error("Middleware lookup error:", error);
      return NextResponse.redirect(new URL("/500", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
