import type { User } from "@supabase/supabase-js";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";
import { AccountLinkingForm } from "./_components/account-linking-form";
import { UsernameForm } from "./_components/username-form";

export const dynamic = "force-dynamic";

async function getCurrentUserProfile(): Promise<{
  user: User;
  profile: Pick<Tables<"profiles">, "full_name"> | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No authenticated user found");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for user", user.id, profileError);
  }

  return { user, profile };
}

async function AccountSettingsContent({ locale }: { locale: string }) {
  let userProfile: Awaited<ReturnType<typeof getCurrentUserProfile>>;
  try {
    userProfile = await getCurrentUserProfile();
  } catch {
    redirect({ href: "/login?redirect=/settings/account", locale });
    return null;
  }

  return (
    <div className="space-y-8">
      <UsernameForm currentUsername={userProfile.profile?.full_name} />
      <AccountLinkingForm user={userProfile.user} />
    </div>
  );
}

export default async function AccountSettingsPage({
  params,
}: PageProps<"/[locale]/settings/account">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        }
      >
        <AccountSettingsContent locale={locale} />
      </Suspense>
    </div>
  );
}
