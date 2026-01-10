import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  getSpaceBingoCards,
  getSpaceParticipants,
} from "@/lib/data/participants";
import { getSpace } from "@/lib/data/spaces";
import { systemFeaturesSchema } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";
import { SpaceResults } from "../../../spaces/[id]/_components/space-results";
import { BingoGameManager } from "./_components/bingo-game-manager";
import { DisplaySettingsDialog } from "./_components/display-settings-dialog";
import { DraftStatusView } from "./_components/draft-status-view";
import { ParticipantsStatus } from "./_components/participants-status";
import { SpaceSettingsSheet } from "./_components/space-settings-sheet";
import { SpaceUrlShare } from "./_components/space-url-share";

function isValidLocale(locale: string): locale is LocaleType {
  return locale === "en" || locale === "ja";
}

export default async function AdminSpacePage({
  params,
}: PageProps<"/[locale]/dashboard/spaces/[id]">) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSpace");
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: `/login?redirect=/dashboard/spaces/${id}`, locale });
  }

  // Fetch space with validated JSONB columns using DAL
  const space = await getSpace(id);

  if (!space) {
    notFound();
  }

  // Check if current user is owner
  const isOwner = space.owner_id === user?.id;

  // Get OAuth provider identities for the owner (to check available OAuth tokens)
  const identities = user?.identities || [];
  const hasGoogleAuth = identities.some(
    (identity) => identity.provider === "google"
  );
  const hasTwitchAuth = identities.some(
    (identity) => identity.provider === "twitch"
  );

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
            twitch: {
              enabled: true,
              follower: { enabled: true },
              subscriber: { enabled: true },
            },
            youtube: {
              enabled: true,
              member: { enabled: true },
              subscriber: { enabled: true },
            },
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

  // Fetch results data for closed/expired spaces
  let resultsData:
    | {
        bingoCards: Awaited<ReturnType<typeof getSpaceBingoCards>>;
        calledNumbers: number[];
        participants: Awaited<ReturnType<typeof getSpaceParticipants>>;
      }
    | undefined;

  if (space.status === "closed" || space.status === "expired") {
    const [participants, bingoCards, calledNumbersData] = await Promise.all([
      getSpaceParticipants(id),
      getSpaceBingoCards(id),
      (async () => {
        const { data } = await supabase
          .from("called_numbers")
          .select("value")
          .eq("space_id", id)
          .order("called_at", { ascending: true });
        return data?.map((row) => row.value) || [];
      })(),
    ]);

    resultsData = {
      bingoCards,
      calledNumbers: calledNumbersData,
      participants,
    };
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-8 p-8">
      {/* Header with Action Buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-gray-600">
            {t("spaceId")}: {space.share_key}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <DisplaySettingsDialog
            initialBackground={initialBackground}
            initialDisplayMode={initialDisplayMode}
            initialLocale={initialScreenLocale}
            initialTheme={initialTheme}
            locale={isValidLocale(locale) ? locale : "en"}
            spaceId={space.id}
            viewToken={space.view_token}
          />
          <SpaceSettingsSheet
            currentParticipantCount={participantCount}
            features={features}
            hasGoogleAuth={hasGoogleAuth}
            hasTwitchAuth={hasTwitchAuth}
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

      {(space.status === "closed" || space.status === "expired") && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-center font-bold text-2xl">
            {t("resultsTitle")}
          </h2>
          {resultsData?.participants && resultsData?.bingoCards ? (
            <SpaceResults
              bingoCards={resultsData.bingoCards}
              calledNumbers={resultsData.calledNumbers}
              participants={resultsData.participants}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">{t("errorLoadingResults")}</p>
            </div>
          )}
        </div>
      )}

      {/* Space URL Share - Always visible at the bottom */}
      <SpaceUrlShare shareKey={space.share_key} />
    </div>
  );
}
