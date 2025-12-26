import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SHARE_KEY_REGEX = /^[a-zA-Z0-9-]+$/;

export async function handleShareKeyRewrite(
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
  const locale = request.headers.get("x-next-intl-locale") || "en";
  url.pathname = `/${locale}/spaces/${data.id}`;
  return NextResponse.rewrite(url);
}

export function validateShareKey(shareKey: string): boolean {
  return !!shareKey && SHARE_KEY_REGEX.test(shareKey);
}
