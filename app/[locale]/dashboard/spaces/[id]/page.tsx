import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { BingoGameManager } from "./_components/bingo-game-manager";
import { CloseSpaceButton } from "./_components/close-space-button";
import { ParticipantsStatus } from "./_components/participants-status";
import { ViewingUrlManager } from "./_components/viewing-url-manager";

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

  // Fetch space (RLS ensures only owner can access)
  const { data: space, error } = await supabase
    .from("spaces")
    .select("id, share_key, view_token, owner_id, status, created_at")
    .eq("id", id)
    .single();

  if (error || !space) {
    notFound();
  }

  return (
    <div className="min-h-screen p-8">
      <Toaster />
      <h1 className="mb-8 font-bold text-3xl">{t("heading")}</h1>

      <div className="mx-auto max-w-3xl space-y-8">
        {/* Status Banner */}
        {space.status === "draft" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="mb-2 font-semibold text-amber-900 text-xl">
              {t("draftStatusTitle")}
            </h2>
            <p className="mb-4 text-amber-800 text-sm">
              {t("draftStatusMessage")}
            </p>
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-amber-700"
              href={`/${locale}/dashboard/spaces/${space.id}/settings`}
            >
              {t("goToSettings")}
            </Link>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">
              {t("spaceId")}: {space.share_key}
            </h2>
            <Link
              className="text-purple-600 text-sm hover:underline"
              href={`/${locale}/dashboard/spaces/${space.id}/settings`}
            >
              {t("settingsLink")}
            </Link>
          </div>

          <ViewingUrlManager
            locale={locale}
            spaceId={space.id}
            viewToken={space.view_token}
          />
        </div>

        {space.status === "active" && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <BingoGameManager spaceId={space.id} />
          </div>
        )}

        {space.status === "active" && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <ParticipantsStatus spaceId={space.id} />
          </div>
        )}

        {space.status === "active" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-xl">
              {t("closeSpaceTitle")}
            </h2>
            <p className="mb-4 text-gray-700 text-sm">
              {t("closeSpaceDescription")}
            </p>
            <CloseSpaceButton spaceId={space.id} />
          </div>
        )}
      </div>
    </div>
  );
}
