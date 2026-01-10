import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Default retention periods
const ARCHIVE_RETENTION_DAYS = Number.parseInt(
  process.env.ARCHIVE_RETENTION_DAYS || "7",
  10
);
const SPACES_ARCHIVE_RETENTION_DAYS = 90; // Keep archived spaces for 90 days in spaces_archive table

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for authentication
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

    // Create Supabase client with service role key for admin operations
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

    // Step 1: Mark expired spaces based on system settings
    const { data: expirationResult, error: expirationError } =
      await supabase.rpc("cleanup_expired_spaces");

    if (expirationError) {
      console.error("Error marking expired spaces:", expirationError);
      // Continue with archive cleanup even if expiration marking fails
    }

    const expiredCount = expirationResult?.[0]?.expired_count || 0;

    console.log(
      `Marked ${expiredCount} space(s) as closed based on system settings`
    );

    // Step 2: Archive and delete closed spaces older than ARCHIVE_RETENTION_DAYS
    const closedCutoffDate = new Date();
    closedCutoffDate.setDate(
      closedCutoffDate.getDate() - ARCHIVE_RETENTION_DAYS
    );

    // Get closed spaces that need to be archived and deleted
    const { data: spacesToArchive, error: fetchError } = await supabase
      .from("spaces")
      .select("id")
      .eq("status", "closed")
      .lt("updated_at", closedCutoffDate.toISOString());

    if (fetchError) {
      console.error("Error fetching closed spaces:", fetchError);
    }

    const archivedCount = spacesToArchive?.length || 0;

    // Delete closed spaces (trigger will automatically move them to spaces_archive)
    if (spacesToArchive && spacesToArchive.length > 0) {
      const spaceIds = spacesToArchive.map((s) => s.id);
      const { error: deleteError } = await supabase
        .from("spaces")
        .delete()
        .in("id", spaceIds);

      if (deleteError) {
        console.error("Error deleting closed spaces:", deleteError);
      } else {
        console.log(
          `Archived and deleted ${archivedCount} closed space(s) older than ${ARCHIVE_RETENTION_DAYS} days (cutoff: ${closedCutoffDate.toISOString()})`
        );
      }
    }

    // Step 3: Delete old archived spaces from spaces_archive table
    const archiveCutoffDate = new Date();
    archiveCutoffDate.setDate(
      archiveCutoffDate.getDate() - SPACES_ARCHIVE_RETENTION_DAYS
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
      `Cleanup completed: deleted ${deletedArchiveCount} archived record(s) older than ${SPACES_ARCHIVE_RETENTION_DAYS} days (cutoff: ${archiveCutoffDate.toISOString()})`
    );

    return NextResponse.json({
      data: {
        archivedCount,
        deletedArchiveCount,
        expiredCount,
        message: `Successfully marked ${expiredCount} space(s) as closed, archived ${archivedCount} closed space(s) older than ${ARCHIVE_RETENTION_DAYS} days, and deleted ${deletedArchiveCount} archived record(s) older than ${SPACES_ARCHIVE_RETENTION_DAYS} days`,
        retentionDays: {
          archive: ARCHIVE_RETENTION_DAYS,
          spacesArchive: SPACES_ARCHIVE_RETENTION_DAYS,
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
