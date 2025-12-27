import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ObsUrlManager } from "./_components/obs-url-manager";

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

  // Fetch space (only if user is the owner, thanks to RLS)
  const { data: space, error } = await supabase
    .from("spaces")
    .select("id, share_key, view_token, owner_id, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
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

          <ObsUrlManager
            locale={locale}
            spaceId={space.id}
            viewToken={space.view_token}
          />
        </div>
      </div>
    </div>
  );
}
