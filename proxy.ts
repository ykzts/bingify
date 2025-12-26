import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/@")) {
    const shareKey = pathname.slice(2);

    try {
      // Supabase クライアントを初期化
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );

      // share_key で space ID を検索
      const { data, error } = await supabase
        .from("spaces")
        .select("id")
        .eq("share_key", shareKey)
        .single();

      if (error || !data) {
        // share_key が見つからない場合は 404 へリダイレクト
        return NextResponse.redirect(new URL("/404", request.url));
      }

      // /spaces/[id] へリライト
      const url = request.nextUrl.clone();
      url.pathname = `/spaces/${data.id}`;
      return NextResponse.rewrite(url);
    } catch (error) {
      console.error("Middleware lookup error:", error);
      return NextResponse.redirect(new URL("/500", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/@:path*"],
};
