import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

export default async function ScreenViewPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ScreenView");
  const supabase = await createClient();

  // Fetch space by view_token (public access, no auth required)
  const { data: space, error } = await supabase
    .from("spaces")
    .select("id, share_key, settings, status")
    .eq("view_token", token)
    .single();

  // If token is invalid or space not found, show error
  if (error || !space) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="mb-4 font-bold text-4xl text-white">
            {t("invalidToken")}
          </h1>
        </div>
      </div>
    );
  }

  // TODO: Subscribe to realtime updates for called numbers
  // TODO: Display bingo board with large numbers

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-6xl text-white">
          {space.share_key}
        </h1>
        <p className="text-2xl text-gray-400">{t("loading")}</p>
      </div>
    </div>
  );
}
