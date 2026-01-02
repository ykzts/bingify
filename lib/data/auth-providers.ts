import { createClient } from "@/lib/supabase/server";

export interface AuthProvider {
  label: string;
  provider: string;
}

export async function getEnabledAuthProviders(): Promise<AuthProvider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_auth_providers")
    .select("provider, label")
    .eq("is_enabled", true)
    .order("provider", { ascending: true });

  if (error) {
    console.error("Error fetching auth providers:", error);
    return [];
  }

  return (
    data?.map((item) => ({
      label: item.label || item.provider,
      provider: item.provider,
    })) || []
  );
}
