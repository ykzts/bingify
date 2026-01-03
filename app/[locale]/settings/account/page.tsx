import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountLinkingForm } from "./_components/account-linking-form";
import { UsernameForm } from "./_components/username-form";

async function AccountSettingsContent({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?redirect=/settings/account", locale });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for user", user.id, profileError);
  }

  return (
    <div className="space-y-8">
      <UsernameForm currentUsername={profile?.full_name} />
      <AccountLinkingForm user={user} />
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
