import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/**
 * 期限切れ通知を削除するCronエンドポイント
 *
 * このエンドポイントは、expires_atが現在時刻より前の通知を自動的に削除します。
 * 毎日3:00 AMに実行されます。
 *
 * @param request - Next.js リクエスト
 * @returns レスポンス
 */
export async function GET(request: NextRequest) {
  try {
    // Cron秘密鍵による認証を検証
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      if (process.env.NODE_ENV !== "development") {
        console.error(
          "CRON_SECRET is not set. Notification cleanup endpoint is disabled in non-development environments."
        );
        return NextResponse.json(
          { error: "Missing CRON_SECRET" },
          { status: 500 }
        );
      }

      console.warn(
        "CRON_SECRET is not set. Authentication is bypassed for notification cleanup endpoint in development."
      );
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 管理操作用にサービスロールキーでSupabaseクライアントを作成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // expires_atが現在時刻より前の通知を削除
    const { error: deleteError, count: deletedCount } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .lt("expires_at", new Date().toISOString());

    if (deleteError) {
      console.error("Error deleting expired notifications:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete expired notifications" },
        { status: 500 }
      );
    }

    console.log(
      `Notification cleanup completed: deleted ${deletedCount || 0} expired notification(s)`
    );

    return NextResponse.json({
      deleted: deletedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Notification cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
