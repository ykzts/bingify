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

    // システム設定から archive_retention_days と spaces_archive_retention_days を取得
    const { data: systemSettings, error: settingsError } = await supabase
      .from("system_settings")
      .select("archive_retention_days, spaces_archive_retention_days")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("Error fetching system settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to fetch system settings" },
        { status: 500 }
      );
    }

    // archive_retention_days の検証（有限の非負整数であることを確認）
    const archiveRetentionDays = systemSettings?.archive_retention_days ?? 7;
    if (
      !Number.isFinite(archiveRetentionDays) ||
      archiveRetentionDays < 0 ||
      !Number.isInteger(archiveRetentionDays)
    ) {
      console.error(
        `Invalid archive_retention_days value: ${archiveRetentionDays}. Using default: 7`
      );
      // デフォルト値を使用して継続
    }

    // spaces_archive_retention_days の検証（有限の非負整数であることを確認）
    const spacesArchiveRetentionDays =
      systemSettings?.spaces_archive_retention_days ?? 90;
    if (
      !Number.isFinite(spacesArchiveRetentionDays) ||
      spacesArchiveRetentionDays < 0 ||
      !Number.isInteger(spacesArchiveRetentionDays)
    ) {
      console.error(
        `Invalid spaces_archive_retention_days value: ${spacesArchiveRetentionDays}. Using default: 90`
      );
      // デフォルト値を使用して継続
    }

    // Step 1: システム設定に基づいて有効期限切れスペースを closed としてマーク
    const { data: expirationResult, error: expirationError } =
      await supabase.rpc("cleanup_expired_spaces");

    if (expirationError) {
      console.error("Error marking expired spaces:", expirationError);
      // 有効期限マーキングが失敗してもアーカイブクリーンアップは継続
    }

    const expiredCount = expirationResult?.[0]?.expired_count || 0;

    console.log(
      `Marked ${expiredCount} space(s) as closed based on system settings`
    );

    // Step 2: archive_retention_days より古い closed スペースをアーカイブして削除
    const closedCutoffDate = new Date();
    const validArchiveRetentionDays =
      Number.isFinite(archiveRetentionDays) && archiveRetentionDays >= 0
        ? archiveRetentionDays
        : 7;
    closedCutoffDate.setDate(
      closedCutoffDate.getDate() - validArchiveRetentionDays
    );

    // 条件付き削除を1回のクエリで実行（スケーラビリティ向上）
    const { data: deletedSpaces, error: deleteError } = await supabase
      .from("spaces")
      .delete()
      .eq("status", "closed")
      .lt("updated_at", closedCutoffDate.toISOString())
      .select("id");

    if (deleteError) {
      console.error("Error deleting closed spaces:", deleteError);
    }

    const archivedCount = deletedSpaces?.length || 0;

    if (archivedCount > 0) {
      console.log(
        `Archived and deleted ${archivedCount} closed space(s) older than ${validArchiveRetentionDays} days (cutoff: ${closedCutoffDate.toISOString()})`
      );
    }

    // Step 3: spaces_archive テーブルから古いアーカイブレコードを削除
    const validSpacesArchiveRetentionDays =
      Number.isFinite(spacesArchiveRetentionDays) &&
      spacesArchiveRetentionDays >= 0
        ? spacesArchiveRetentionDays
        : 90;
    const archiveCutoffDate = new Date();
    archiveCutoffDate.setDate(
      archiveCutoffDate.getDate() - validSpacesArchiveRetentionDays
    );

    const { data: deletedArchives, error: archiveError } = await supabase
      .from("spaces_archive")
      .delete()
      .lt("archived_at", archiveCutoffDate.toISOString())
      .select("id");

    if (archiveError) {
      console.error("Error deleting old archives:", archiveError);
      return NextResponse.json(
        { error: "Failed to delete old archives" },
        { status: 500 }
      );
    }

    const deletedArchiveCount = deletedArchives?.length || 0;

    console.log(
      `Cleanup completed: deleted ${deletedArchiveCount} archived record(s) older than ${validSpacesArchiveRetentionDays} days (cutoff: ${archiveCutoffDate.toISOString()})`
    );

    return NextResponse.json({
      data: {
        archivedCount,
        deletedArchiveCount,
        expiredCount,
        message: `Successfully marked ${expiredCount} space(s) as closed, archived ${archivedCount} closed space(s) older than ${validArchiveRetentionDays} days, and deleted ${deletedArchiveCount} archived record(s) older than ${validSpacesArchiveRetentionDays} days`,
        retentionDays: {
          archive: validArchiveRetentionDays,
          spacesArchive: validSpacesArchiveRetentionDays,
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
