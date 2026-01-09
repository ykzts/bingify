import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { getAvailableAvatars } from "@/lib/services/avatar-service";
import { createClient } from "@/lib/supabase/server";
import { AvatarSelectionForm } from "../account/_components/avatar-selection-form";

async function AvatarSettingsContent({ locale }: { locale: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login?redirect=/settings/avatar", locale });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_source, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for user", user.id, profileError);
  }

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

  // Get uploaded avatar URL if available
  const uploadedAvatarUrl =
    profile?.avatar_source === "upload" ? profile.avatar_url : null;

  return (
    <div className="space-y-8">
      <AvatarSelectionForm
        availableAvatars={availableAvatars || []}
        currentAvatarSource={safeCurrentAvatarSource}
        uploadedAvatarUrl={uploadedAvatarUrl}
      />
    </div>
  );
}

export default async function AvatarSettingsPage({
  params,
}: PageProps<"/[locale]/settings/avatar">) {
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
      <AvatarSettingsContent locale={locale} />
    </Suspense>
  );
}
