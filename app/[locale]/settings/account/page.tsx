import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { getSystemSettings } from "@/lib/data/system-settings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/schemas/system-settings";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { getAvailableAvatars } from "@/lib/services/avatar-service";
import { createClient } from "@/lib/supabase/server";
import { AccountLinkingForm } from "./_components/account-linking-form";
import { AvatarSelectionForm } from "./_components/avatar-selection-form";
import { EmailChangeForm } from "./_components/email-change-form";
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
    .select("full_name, avatar_source, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for user", user.id, profileError);
  }

  // Fetch system settings for OAuth scope configuration
  const systemSettingsResult = await getSystemSettings();
  const systemSettings =
    systemSettingsResult.settings || DEFAULT_SYSTEM_SETTINGS;

  // Fetch available avatars
  const { data: availableAvatars, error: avatarsError } =
    await getAvailableAvatars(user.id);

  if (avatarsError) {
    console.error("Error fetching available avatars:", avatarsError);
  }

  // Validate avatar_source and provide safe fallback
  const allowedSources: AvatarSource[] = [
    "google",
    "twitch",
    "upload",
    "default",
  ];
  const safeCurrentAvatarSource: AvatarSource =
    profile?.avatar_source &&
    allowedSources.includes(profile.avatar_source as AvatarSource)
      ? (profile.avatar_source as AvatarSource)
      : "default";

  return (
    <div className="space-y-8">
      <UsernameForm currentUsername={profile?.full_name} />
      <EmailChangeForm currentEmail={user.email} />
      <AccountLinkingForm systemSettings={systemSettings} user={user} />
      {availableAvatars && availableAvatars.length > 0 && (
        <AvatarSelectionForm
          availableAvatars={availableAvatars}
          currentAvatarSource={safeCurrentAvatarSource}
        />
      )}
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
