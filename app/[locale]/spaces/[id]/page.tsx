import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getSpaceBingoCards,
  getSpaceParticipants,
} from "@/lib/data/participants";
import { getSystemSettings } from "@/lib/data/system-settings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserParticipation,
  getSpaceById,
  getSpacePublicInfo,
} from "../_actions/space-join";
import { BingoCardDisplay } from "./_components/bingo-card-display";
import { EventEndedView } from "./_components/event-ended-view";
import { SpaceLandingPage } from "./_components/space-landing-page";
import { SpaceParticipation } from "./_components/space-participation";
import { SpaceResults } from "./_components/space-results";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/spaces/[id]">): Promise<Metadata> {
  const { id, locale } = await params;
  const publicInfo = await getSpacePublicInfo(id);

  if (!publicInfo) {
    return {
      title: "Space Not Found",
    };
  }

  const t = await getTranslations({ locale, namespace: "UserSpace" });

  // Use title if available, otherwise fall back to share_key
  const displayTitle = publicInfo.title || publicInfo.share_key;

  // Use custom description if available, otherwise use default localized message with title or share_key
  const displayDescription =
    publicInfo.description ||
    t("metaDescription", {
      spaceName: publicInfo.title || publicInfo.share_key,
    });

  return {
    description: displayDescription,
    openGraph: {
      description: displayDescription,
      title: displayTitle,
    },
    title: displayTitle,
    twitter: {
      card: "summary_large_image",
      description: displayDescription,
      title: displayTitle,
    },
  };
}

export default async function UserSpacePage({
  params,
}: PageProps<"/[locale]/spaces/[id]">) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");
  const tLanding = await getTranslations("SpaceLanding");

  // Fetch space information
  const space = await getSpaceById(id);

  // If space doesn't exist, show 404
  if (!space) {
    notFound();
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If space is draft, only owner can access - others get 404
  if (space.status === "draft") {
    if (!user || space.owner_id !== user.id) {
      notFound();
    }

    // Owner sees waiting screen
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-4 font-bold text-2xl text-gray-900">
            {t("draftTitle")}
          </h1>
          <p className="mb-6 text-gray-600">{t("draftMessage")}</p>
          <Link className="text-purple-600 hover:underline" href="/">
            {t("backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  // If space is closed or expired, show results for participants
  if (space.status === "closed" || space.status === "expired") {
    // Check if user is a participant to show results
    const isParticipant = await checkUserParticipation(id);

    if (!isParticipant) {
      // Non-participants see event ended message
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-4xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="mb-1 font-bold text-2xl">{space.share_key}</h1>
                <p className="text-gray-600 text-sm">{t("spaceSubtitle")}</p>
              </div>
              <Link
                className="text-gray-600 text-sm hover:text-gray-900 hover:underline"
                href="/"
              >
                {t("backToHome")}
              </Link>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
              <EventEndedView />
            </div>
          </div>
        </div>
      );
    }

    // Participants see full results including all participants and cards
    const [participants, bingoCards, calledNumbersData] = await Promise.all([
      getSpaceParticipants(id),
      getSpaceBingoCards(id),
      (async () => {
        const supabase = await createClient();
        const { data } = await supabase
          .from("called_numbers")
          .select("value")
          .eq("space_id", id)
          .order("called_at", { ascending: true });
        return data?.map((row) => row.value) || [];
      })(),
    ]);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mb-1 font-bold text-2xl">{space.share_key}</h1>
              <p className="text-gray-600 text-sm">{t("spaceSubtitle")}</p>
            </div>
            <Link
              className="text-gray-600 text-sm hover:text-gray-900 hover:underline"
              href="/"
            >
              {t("backToHome")}
            </Link>
          </div>

          {/* Event Ended Message */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <EventEndedView />
          </div>

          {/* Your Card Section */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-center font-bold text-2xl">
              {t("yourCard")}
            </h2>
            <BingoCardDisplay readOnly spaceId={id} />
          </div>

          {/* Results Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-center font-bold text-2xl">
              {t("resultsTitle")}
            </h2>
            {participants && bingoCards ? (
              <SpaceResults
                bingoCards={bingoCards}
                calledNumbers={calledNumbersData}
                participants={participants}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">{t("errorLoadingResults")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If space is not active, show 404
  if (space.status !== "active") {
    notFound();
  }

  // Check if user is already a participant
  const isParticipant = await checkUserParticipation(id);

  // Fetch system settings for OAuth scope configuration
  const systemSettingsResult = await getSystemSettings();
  const systemSettings =
    systemSettingsResult.settings || DEFAULT_SYSTEM_SETTINGS;

  // For non-participants, fetch public info to show landing page
  if (!isParticipant) {
    const publicInfo = await getSpacePublicInfo(id);

    if (!publicInfo) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Space Content */}
        <div className="mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mb-1 font-bold text-2xl">
                {publicInfo.hideMetadata
                  ? tLanding("privateSpace")
                  : publicInfo.share_key}
              </h1>
              <p className="text-gray-600 text-sm">{t("spaceSubtitle")}</p>
            </div>
            <Link
              className="text-gray-600 text-sm hover:text-gray-900 hover:underline"
              href="/"
            >
              {t("backToHome")}
            </Link>
          </div>

          {/* Landing Page for non-participants */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <SpaceLandingPage publicInfo={publicInfo} />
          </div>

          {/* Participant Info Section */}
          <div className="mt-6">
            <SpaceParticipation
              spaceId={id}
              spaceInfo={space}
              systemSettings={systemSettings}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Space Content */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 font-bold text-2xl">{space.share_key}</h1>
            <p className="text-gray-600 text-sm">{t("spaceSubtitle")}</p>
          </div>
          <Link
            className="text-gray-600 text-sm hover:text-gray-900 hover:underline"
            href="/"
          >
            {t("backToHome")}
          </Link>
        </div>

        {/* Main Space Content - Bingo Game */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <BingoCardDisplay spaceId={id} />
        </div>

        {/* Participant Info Section */}
        <div className="mt-6">
          <SpaceParticipation
            spaceId={id}
            spaceInfo={space}
            systemSettings={systemSettings}
          />
        </div>
      </div>
    </div>
  );
}
