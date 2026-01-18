import { createClient } from "@/lib/supabase/server";
import { MobileFooterNav } from "./mobile-footer-nav";

interface UserProfile {
  avatar_url?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
}

async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, email, full_name, role")
    .eq("id", authUser.id)
    .single();

  if (error) {
    console.error("Failed to fetch user profile:", error);
    return {
      avatar_url: null,
      email: authUser.email || null,
      full_name: null,
      role: null,
    };
  }

  return (
    data || {
      avatar_url: null,
      email: authUser.email || null,
      full_name: null,
      role: null,
    }
  );
}

export async function MobileFooterNavWrapper() {
  const user = await getUserProfile();

  if (!user) {
    return null;
  }

  return <MobileFooterNav user={user} />;
}
