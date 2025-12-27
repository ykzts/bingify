import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { UserHeader } from "./user-header";

async function UserHeaderData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, email, full_name")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return <UserHeader user={data} />;
}

export function UserHeaderWrapper() {
  return (
    <Suspense fallback={null}>
      <UserHeaderData />
    </Suspense>
  );
}
