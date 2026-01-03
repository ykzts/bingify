import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { BackgroundType, DisplayMode } from "@/lib/types/screen-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { ScreenDisplay } from "./_components/screen-display";

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

  // Fetch screen settings for this space
  const { data: screenSettings } = await supabase
    .from("screen_settings")
    .select("display_mode, background")
    .eq("space_id", space.id)
    .single();

  // Use settings from database, fallback to defaults
  const initialMode: DisplayMode =
    (screenSettings?.display_mode as DisplayMode) || "full";
  const initialBg: BackgroundType =
    (screenSettings?.background as BackgroundType) || "default";

  // Get base URL for QR code generation
  const baseUrl = getAbsoluteUrl();

  return (
    <ScreenDisplay
      baseUrl={baseUrl}
      initialBg={initialBg}
      initialMode={initialMode}
      locale={locale}
      shareKey={space.share_key}
      spaceId={space.id}
    />
  );
}
