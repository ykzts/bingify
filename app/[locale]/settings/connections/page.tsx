import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { getSystemSettings } from "@/lib/data/system-settings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import { AccountLinkingForm } from "../account/_components/account-linking-form";

async function ConnectionsSettingsContent({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?redirect=/settings/connections", locale });
    return null;
  }

  // Fetch system settings for OAuth scope configuration
  const systemSettingsResult = await getSystemSettings();
  const systemSettings =
    systemSettingsResult.settings || DEFAULT_SYSTEM_SETTINGS;

  return (
    <div className="space-y-8">
      <AccountLinkingForm systemSettings={systemSettings} user={user} />
    </div>
  );
}

export default async function ConnectionsSettingsPage({
  params,
}: PageProps<"/[locale]/settings/connections">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      }
    >
      <ConnectionsSettingsContent locale={locale} />
    </Suspense>
  );
}
