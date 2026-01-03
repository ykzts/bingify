import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSpace } from "@/lib/data/spaces";
import { systemFeaturesSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";
import { BingoGameManager } from "./_components/bingo-game-manager";
import { DraftStatusView } from "./_components/draft-status-view";
import { ParticipantsStatus } from "./_components/participants-status";
import { ScreenSettingsDialog } from "./_components/screen-settings-dialog";
import { SpaceSettingsSheet } from "./_components/space-settings-sheet";
import { ViewingUrlDialog } from "./_components/viewing-url-dialog";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function AdminSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSpace");
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/dashboard/spaces/${id}`);
  }

  // Fetch space with validated JSONB columns using DAL
  const space = await getSpace(id);

  if (!space) {
    notFound();
  }

  // Check if current user is owner
  const isOwner = space.owner_id === user.id;

  // Get current participant count
  const { data: participantsData } = await supabase
    .from("participants")
    .select("id")
    .eq("space_id", id);

  const participantCount = participantsData?.length ?? 0;

  // Get system settings for the settings sheet
  const { data: systemSettings } = await supabase
    .from("system_settings")
    .select("features, max_participants_per_space")
    .eq("id", 1)
    .single();

  // Validate features field using Zod schema
  const featuresValidation = systemFeaturesSchema.safeParse(
    systemSettings?.features
  );

  const features: import("@/lib/types/settings").SystemFeatures =
    featuresValidation.success
      ? featuresValidation.data
      : {
          gatekeeper: {
            email: { enabled: true },
            twitch: { enabled: true },
            youtube: { enabled: true },
          },
        };

  // Fetch screen settings for this space
  const { data: screenSettings } = await supabase
    .from("screen_settings")
    .select("display_mode, background, theme, locale")
    .eq("space_id", id)
    .single();

  const initialDisplayMode: DisplayMode =
    (screenSettings?.display_mode as DisplayMode) || "full";
  const initialBackground: BackgroundType =
    (screenSettings?.background as BackgroundType) || "default";
  const initialTheme: ThemeType =
    (screenSettings?.theme as ThemeType) || "dark";
  const initialScreenLocale: LocaleType | undefined = screenSettings?.locale as
    | LocaleType
    | undefined;

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-8 p-8">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-gray-600">
            {t("spaceId")}: {space.share_key}
          </p>
        </div>
        <div className="flex gap-3">
          <ViewingUrlDialog
            locale={locale}
            spaceId={space.id}
            viewToken={space.view_token}
          />
          <ScreenSettingsDialog
            initialBackground={initialBackground}
            initialDisplayMode={initialDisplayMode}
            initialLocale={initialScreenLocale}
            initialTheme={initialTheme}
            locale={locale}
            spaceId={space.id}
            viewToken={space.view_token}
          />
          <SpaceSettingsSheet
            currentParticipantCount={participantCount}
            features={features}
            isOwner={isOwner}
            locale={locale}
            space={space}
            systemMaxParticipants={
              systemSettings?.max_participants_per_space || 1000
            }
          />
        </div>
      </div>
      {/* Main Content Area - Status-based rendering */}
      {space.status === "draft" && (
        <DraftStatusView locale={locale} spaceId={space.id} />
      )}

      {space.status === "active" && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <BingoGameManager spaceId={space.id} />
          </div>

          <ParticipantsStatus
            maxParticipants={space.max_participants}
            spaceId={space.id}
          />
        </>
      )}

      {space.status === "closed" && (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="mb-2 font-bold text-2xl">{t("closeSpaceTitle")}</h2>
            <p className="text-gray-600">{t("closeSpaceDescription")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
