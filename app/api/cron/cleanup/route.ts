import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: クリーンアップ処理は複数のステップを含むため複雑度が高い
export async function GET(request: NextRequest) {
  try {
    // Cron秘密鍵による認証を検証
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      if (process.env.NODE_ENV !== "development") {
        console.error(
          "CRON_SECRET is not set. Cleanup endpoint is disabled in non-development environments."
        );
        return NextResponse.json(
          { error: "Missing CRON_SECRET" },
          { status: 500 }
        );
      }

      console.warn(
        "CRON_SECRET is not set. Authentication is bypassed for cleanup endpoint in development."
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

    // システム設定から archive_retention_hours と spaces_archive_retention_hours を取得
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("archive_retention_hours, spaces_archive_retention_hours")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching system settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to fetch system settings" },
        { status: 500 }
      );
    }

    // archive_retention_hours の検証（有限の非負整数であることを確認）
    let archiveRetentionHours = systemSettings?.archive_retention_hours ?? 168; // 7 days default
    if (
      !Number.isFinite(archiveRetentionHours) ||
      archiveRetentionHours < 0 ||
      !Number.isInteger(archiveRetentionHours)
    ) {
      console.error(
        `Invalid archive_retention_hours value: ${archiveRetentionHours}. Using default: 168 (7 days)`
      );
      archiveRetentionHours = 168; // デフォルト値を使用
    }

    // spaces_archive_retention_hours の検証（有限の非負整数であることを確認）
    let spacesArchiveRetentionHours =
      systemSettings?.spaces_archive_retention_hours ?? 2160; // 90 days default
    if (
      !Number.isFinite(spacesArchiveRetentionHours) ||
      spacesArchiveRetentionHours < 0 ||
      !Number.isInteger(spacesArchiveRetentionHours)
    ) {
      console.error(
        `Invalid spaces_archive_retention_hours value: ${spacesArchiveRetentionHours}. Using default: 2160 (90 days)`
      );
      spacesArchiveRetentionHours = 2160; // デフォルト値を使用
    }

    // Step 1: システム設定に基づいて有効期限切れスペースを closed としてマーク
    const { data: closedResult, error: closedError } = await supabase.rpc(
      "cleanup_expired_spaces"
    );

    if (closedError) {
      console.error("Error marking spaces as closed:", closedError);
      // closed マーキングが失敗してもアーカイブクリーンアップは継続
    }

    const markedClosedCount = closedResult?.[0]?.expired_count || 0;

    console.log(
      `Marked ${markedClosedCount} space(s) as closed based on system settings`
    );

    // Step 2: archive_retention_hours より古い closed スペースをアーカイブして削除
    const validArchiveRetentionHours =
      Number.isFinite(archiveRetentionHours) && archiveRetentionHours >= 0
        ? archiveRetentionHours
        : 168; // 7 days default
    const closedCutoffMs = Date.now() - validArchiveRetentionHours * 3_600_000;
    const closedCutoffDate = new Date(closedCutoffMs);

    // 条件付き削除を1回のクエリで実行（スケーラビリティ向上、count:'exact'のみでminimal返却）
    const { error: deleteError, count: archivedCount } = await supabase
      .from("spaces")
      .delete({ count: "exact" })
      .eq("status", "closed")
      .lt("updated_at", closedCutoffDate.toISOString());

    if (deleteError) {
      console.error("Error deleting closed spaces:", deleteError);
    }

    if (archivedCount && archivedCount > 0) {
      console.log(
        `Archived and deleted ${archivedCount} closed space(s) older than ${validArchiveRetentionHours} hours (${Math.round(validArchiveRetentionHours / 24)} days) (cutoff: ${closedCutoffDate.toISOString()})`
      );
    }

    // Step 3: spaces_archive テーブルから古いアーカイブレコードを削除
    const validSpacesArchiveRetentionHours =
      Number.isFinite(spacesArchiveRetentionHours) &&
      spacesArchiveRetentionHours >= 0
        ? spacesArchiveRetentionHours
        : 2160; // 90 days default
    const archiveCutoffMs =
      Date.now() - validSpacesArchiveRetentionHours * 3_600_000;
    const archiveCutoffDate = new Date(archiveCutoffMs);

    const { error: archiveError, count: deletedArchiveCount } = await supabase
      .from("spaces_archive")
      .delete({ count: "exact" })
      .lt("archived_at", archiveCutoffDate.toISOString());

    if (archiveError) {
      console.error("Error deleting old archives:", archiveError);
      return NextResponse.json(
        { error: "Failed to delete old archives" },
        { status: 500 }
      );
    }

    console.log(
      `Cleanup completed: deleted ${deletedArchiveCount || 0} archived record(s) older than ${validSpacesArchiveRetentionHours} hours (${Math.round(validSpacesArchiveRetentionHours / 24)} days) (cutoff: ${archiveCutoffDate.toISOString()})`
    );

    return NextResponse.json({
      data: {
        archivedCount: archivedCount || 0,
        deletedArchiveCount: deletedArchiveCount || 0,
        markedClosedCount,
        message: `Successfully marked ${markedClosedCount} space(s) as closed, archived ${archivedCount || 0} closed space(s) older than ${Math.round(validArchiveRetentionHours / 24)} days, and deleted ${deletedArchiveCount || 0} archived record(s) older than ${Math.round(validSpacesArchiveRetentionHours / 24)} days`,
        retentionHours: {
          archive: validArchiveRetentionHours,
          spacesArchive: validSpacesArchiveRetentionHours,
        },
      },
    });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
