import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HeaderMenu } from "./header-menu";

async function HeaderMenuData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <HeaderMenu user={null} />;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to fetch user profile:", error);
    return (
      <HeaderMenu
        user={{
          avatar_url: null,
          email: user.email || null,
          full_name: null,
        }}
      />
    );
  }

  if (!data) {
    return (
      <HeaderMenu
        user={{
          avatar_url: null,
          email: user.email || null,
          full_name: null,
        }}
      />
    );
  }

  return <HeaderMenu user={data} />;
}

export function HeaderMenuWrapper() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-gray-200"
        />
      }
    >
      <HeaderMenuData />
    </Suspense>
  );
}
