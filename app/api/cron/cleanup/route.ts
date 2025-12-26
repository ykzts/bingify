import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Retention period in days (90 days)
const RETENTION_DAYS = 90;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for authentication
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!(supabaseUrl && supabaseServiceKey)) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date
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

    return NextResponse.json({
      deletedCount,
      message: `Successfully deleted ${deletedCount} archived record(s) older than ${RETENTION_DAYS} days`,
      success: true,
    });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
