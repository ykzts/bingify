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
    .select("avatar_url, email, full_name")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return <HeaderMenu user={null} />;
  }

  return <HeaderMenu user={data} />;
}

export function HeaderMenuWrapper() {
  return (
    <Suspense fallback={null}>
      <HeaderMenuData />
    </Suspense>
  );
}
