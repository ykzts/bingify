import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserParticipation,
  getSpaceById,
  getSpacePublicInfo,
} from "../actions";
import { BingoCardDisplay } from "./_components/bingo-card-display";
import { SpaceLandingPage } from "./_components/space-landing-page";
import { SpaceParticipation } from "./_components/space-participation";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const space = await getSpaceById(id);

  if (!space) {
    return {
      title: "Space Not Found",
    };
  }

  return {
    description: `Join the bingo space: ${space.share_key}`,
    openGraph: {
      description: `Join the bingo space: ${space.share_key}`,
      title: `Bingify - ${space.share_key}`,
    },
    title: `${space.share_key} - Bingify`,
    twitter: {
      card: "summary_large_image",
      description: `Join the bingo space: ${space.share_key}`,
      title: `Bingify - ${space.share_key}`,
    },
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Space page requires handling draft/active status, participant checks, and different views
export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");

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
          <Link className="text-purple-600 hover:underline" href={`/${locale}`}>
            {t("backToHome")}
          </Link>
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

  // For non-participants, fetch public info to show landing page
  if (!isParticipant) {
    const publicInfo = await getSpacePublicInfo(id);

    if (!publicInfo) {
      notFound();
    }

    // If space is draft, show waiting screen
    if (publicInfo.status === "draft") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="mb-4 font-bold text-2xl text-gray-900">
              {t("draftTitle")}
            </h1>
            <p className="mb-6 text-gray-600">{t("draftMessage")}</p>
            <Link
              className="text-purple-600 hover:underline"
              href={`/${locale}`}
            >
              {t("backToHome")}
            </Link>
          </div>
        </div>
      );
    }

    // If space is not active, show 404
    if (publicInfo.status !== "active") {
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
                  ? t("privateSpace")
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
            <SpaceParticipation spaceId={id} spaceInfo={space} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Join Banner for non-participants */}
      {!isParticipant && (
        <div className="border-yellow-200 border-b bg-yellow-50 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">
                {t("notParticipantBanner")}
              </p>
            </div>
            <SpaceParticipation compact spaceId={id} spaceInfo={space} />
          </div>
        </div>
      )}

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
          {isParticipant ? (
            <BingoCardDisplay spaceId={id} />
          ) : (
            <div className="text-center">
              <h2 className="mb-4 font-bold text-xl">{t("bingoGameTitle")}</h2>
              <p className="mb-6 text-gray-600">{t("bingoGamePlaceholder")}</p>

              {/* Placeholder for bingo card/game */}
              <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
                {Array.from({ length: 25 }, (_, i) => i + 1).map(
                  (cellNumber) => (
                    <div
                      className="flex aspect-square items-center justify-center rounded border border-gray-300 bg-gray-50 font-bold text-gray-400"
                      key={cellNumber}
                    >
                      {cellNumber}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Participant Info Section */}
        <div className="mt-6">
          <SpaceParticipation spaceId={id} spaceInfo={space} />
        </div>
      </div>
    </div>
  );
}
