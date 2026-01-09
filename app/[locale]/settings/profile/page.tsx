import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailChangeForm } from "./_components/email-change-form";
import { UsernameForm } from "./_components/username-form";

async function ProfileSettingsContent({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({
      href: `/login?redirect=${encodeURIComponent("/settings/profile")}`,
      locale,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }

  return (
    <div className="space-y-8">
      <UsernameForm currentUsername={profile?.full_name} />
      <EmailChangeForm currentEmail={user.email ?? undefined} />
    </div>
  );
}

export default async function ProfileSettingsPage({
  params,
}: PageProps<"/[locale]/settings/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading"
          className="flex items-center justify-center py-12"
          role="status"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      }
    >
      <ProfileSettingsContent locale={locale} />
    </Suspense>
  );
}
