import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpaceAnnouncementList } from "@/components/announcements/space-announcement-list";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkIsSpaceAdmin } from "@/lib/utils/space-permissions";
import {
  checkUserParticipation,
  getSpaceById,
  getSpacePublicInfo,
} from "../_actions/space-join";
import { BingoCardDisplay } from "./_components/bingo-card-display";
import { EventEndedView } from "./_components/event-ended-view";
import { SpaceLandingPage } from "./_components/space-landing-page";
import { SpaceParticipation } from "./_components/space-participation";

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-4 font-bold text-2xl text-gray-900 dark:text-gray-100">
            {t("draftTitle")}
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {t("draftMessage")}
          </p>
          <Link
            className="text-purple-600 hover:underline dark:text-purple-400"
            href="/"
          >
            {t("backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  // If space is closed, show event ended screen
  if (space.status === "closed") {
    // Check if user is a participant to show their final card
    const isParticipant = await checkUserParticipation(id);

    // Check if current user is admin (for announcement management)
    const isAdmin = await checkIsSpaceAdmin(id, user?.id);

    if (!isParticipant) {
      // Non-participants see event ended message
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="mb-1 font-bold text-2xl dark:text-gray-100">
                  {space.share_key}
                </h1>
                <p className="text-gray-600 text-sm dark:text-gray-400">
                  {t("spaceSubtitle")}
                </p>
              </div>
              <Link
                className="text-gray-600 text-sm hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
                href="/"
              >
                {t("backToHome")}
              </Link>
            </div>

            {/* Announcements Section */}
            <div className="mb-6">
              <SpaceAnnouncementList isAdmin={isAdmin} spaceId={id} />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <EventEndedView />
            </div>
          </div>
        </div>
      );
    }

    // Participants see their final card (read-only)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mb-1 font-bold text-2xl dark:text-gray-100">
                {space.share_key}
              </h1>
              <p className="text-gray-600 text-sm dark:text-gray-400">
                {t("spaceSubtitle")}
              </p>
            </div>
            <Link
              className="text-gray-600 text-sm hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
              href="/"
            >
              {t("backToHome")}
            </Link>
          </div>

          {/* Announcements Section */}
          <div className="mb-6">
            <SpaceAnnouncementList isAdmin={isAdmin} spaceId={id} />
          </div>

          {/* Event Ended Message */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <EventEndedView />
          </div>

          {/* Participant's Final Result */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-center font-bold text-2xl dark:text-gray-100">
              {t("yourFinalResultTitle")}
            </h2>
            <BingoCardDisplay readOnly spaceId={id} />
          </div>
        </div>
      </div>
    );
  }

  // If space is not active, show 404
  if (space.status !== "active") {
    notFound();
  }

  // Check if user is a participant
  const isParticipant = await checkUserParticipation(id);

  // Check if current user is admin (for announcement management)
  const isAdmin = await checkIsSpaceAdmin(id, user?.id);

  // For non-participants, fetch public info to show landing page
  if (!isParticipant) {
    const publicInfo = await getSpacePublicInfo(id);

    if (!publicInfo) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Space Content */}
        <div className="mx-auto max-w-4xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mb-1 font-bold text-2xl dark:text-gray-100">
                {publicInfo.hideMetadata
                  ? tLanding("privateSpace")
                  : publicInfo.share_key}
              </h1>
              <p className="text-gray-600 text-sm dark:text-gray-400">
                {t("spaceSubtitle")}
              </p>
            </div>
            <Link
              className="text-gray-600 text-sm hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
              href="/"
            >
              {t("backToHome")}
            </Link>
          </div>

          {/* Announcements Section */}
          <div className="mb-6">
            <SpaceAnnouncementList isAdmin={isAdmin} spaceId={id} />
          </div>

          {/* Landing Page for non-participants */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <SpaceLandingPage publicInfo={publicInfo} />
          </div>

          {/* Participant Info Section */}
          <div className="mt-6">
            <SpaceParticipation spaceId={id} spaceInfo={space} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Space Content */}
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 font-bold text-2xl dark:text-gray-100">
              {space.share_key}
            </h1>
            <p className="text-gray-600 text-sm dark:text-gray-400">
              {t("spaceSubtitle")}
            </p>
          </div>
          <Link
            className="text-gray-600 text-sm hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
            href="/"
          >
            {t("backToHome")}
          </Link>
        </div>

        {/* Announcements Section */}
        <div className="mb-6">
          <SpaceAnnouncementList isAdmin={isAdmin} spaceId={id} />
        </div>

        {/* Main Space Content - Bingo Game */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <BingoCardDisplay spaceId={id} />
        </div>

        {/* Participant Info Section */}
        <div className="mt-6">
          <SpaceParticipation spaceId={id} spaceInfo={space} />
        </div>
      </div>
    </div>
  );
}
