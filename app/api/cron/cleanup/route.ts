import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Retention period in days (90 days)
const RETENTION_DAYS = 90;

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
    const { data: expirationResult } = await supabase.rpc(
      "cleanup_expired_spaces"
    );

    const expiredCount = expirationResult?.[0]?.expired_count || 0;
    const expiredSpaceIds = expirationResult?.[0]?.expired_space_ids || [];

    console.log(
      `Marked ${expiredCount} space(s) as expired based on system settings`
    );

    // Step 2: Calculate cutoff date for archived spaces
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Delete old archived spaces
    const { data: deletedSpaces, error: spacesError } = await supabase
      .from("spaces_archive")
      .delete()
      .lt("archived_at", cutoffDate.toISOString())
      .select("id");

    if (spacesError) {
      console.error("Error deleting archived spaces:", spacesError);
      return NextResponse.json(
        { error: "Failed to delete archived spaces" },
        { status: 500 }
      );
    }

    const deletedCount = deletedSpaces?.length || 0;

    console.log(
      `Cleanup completed: deleted ${deletedCount} archived record(s) older than ${RETENTION_DAYS} days (cutoff: ${cutoffDate.toISOString()})`
    );

    return NextResponse.json({
      data: {
        deletedCount,
        expiredCount,
        message: `Successfully marked ${expiredCount} space(s) as expired and deleted ${deletedCount} archived record(s) older than ${RETENTION_DAYS} days`,
        retentionDays: RETENTION_DAYS,
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
