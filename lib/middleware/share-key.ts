import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { detectLocaleFromRequest } from "./locale-detection";

const SHARE_KEY_REGEX = /^[a-zA-Z0-9-]+$/;

export async function handleShareKeyRoute(
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

export async function handleShareKeyRewrite(
  request: NextRequest,
  shareKey: string,
  locale: string
): Promise<NextResponse> {
  // Validate required Supabase credentials
  if (
    !(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  ) {
    console.error("Supabase credentials are not configured");
    return new NextResponse("Internal Server Error", { status: 500 });
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
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/spaces/${data.id}`;
  return NextResponse.rewrite(url);
}

export function validateShareKey(shareKey: string): boolean {
  return !!shareKey && SHARE_KEY_REGEX.test(shareKey);
}
