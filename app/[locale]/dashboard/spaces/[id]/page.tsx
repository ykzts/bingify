import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { BingoGameManager } from "./_components/bingo-game-manager";
import { CloseSpaceButton } from "./_components/close-space-button";
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
    redirect(`/${locale}/login`);
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
      <h1 className="mb-8 font-bold text-3xl">{t("heading")}</h1>

      <div className="mx-auto max-w-3xl space-y-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">
            {t("spaceId")}: {space.share_key}
          </h2>

          <ViewingUrlManager
            locale={locale}
            spaceId={space.id}
            viewToken={space.view_token}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <BingoGameManager spaceId={space.id} />
        </div>

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
