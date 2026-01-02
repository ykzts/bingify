import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface AuthProvider {
  label: string;
  provider: string;
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("system_auth_providers")
      .select("provider, label")
      .eq("is_enabled", true)
      .order("provider", { ascending: true });

    if (error) {
      console.error("Error fetching auth providers:", error);
      return NextResponse.json(
        { error: "Failed to fetch auth providers" },
        { status: 500 }
      );
    }

    const providers: AuthProvider[] =
      data?.map((item) => ({
        label: item.label || item.provider,
        provider: item.provider,
      })) || [];

    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Unexpected error fetching auth providers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
