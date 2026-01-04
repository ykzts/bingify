import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { HeaderMenuContent } from "./content";

async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No authenticated user found");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to fetch user profile", { cause: error });
  }

  return data;
}

function LoginButton({ children }: { children?: React.ReactNode }) {
  return (
    <Button asChild type="button" variant="outline">
      <Link href="/login">{children}</Link>
    </Button>
  );
}

export async function HeaderMenuData() {
  const t = await getTranslations("HeaderMenu");

  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
  } catch {
    return <LoginButton>{t("login")}</LoginButton>;
  }

  return <HeaderMenuContent user={user} />;
}

export function HeaderMenu() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-muted"
        />
      }
    >
      <HeaderMenuData />
    </Suspense>
  );
}
