import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { checkUserParticipation, getSpaceById } from "../actions";
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

export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");

  // Fetch space information
  const space = await getSpaceById(id);

  // If space doesn't exist or is inactive, show 404
  if (!space || space.status !== "active") {
    notFound();
  }

  // Check if user is already a participant
  const isParticipant = await checkUserParticipation(id);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Space Header */}
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">{space.share_key}</h1>
          <p className="text-gray-600">{t("joinPrompt")}</p>
        </div>

        {/* Participation Component */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {isParticipant ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-center font-medium text-green-800">
                  {t("alreadyJoined")}
                </p>
              </div>
              <SpaceParticipation spaceId={id} spaceInfo={space} />
            </div>
          ) : (
            <SpaceParticipation spaceId={id} spaceInfo={space} />
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <a
            className="text-gray-600 text-sm hover:text-gray-900 hover:underline"
            href="/"
          >
            {t("backToHome")}
          </a>
        </div>
      </div>
    </div>
  );
}
