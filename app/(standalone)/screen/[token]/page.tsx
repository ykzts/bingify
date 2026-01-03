import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { ScreenDisplay } from "./_components/screen-display";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ScreenViewPage({ params }: Props) {
  const { token } = await params;

  const supabase = await createClient();

  // Fetch space by view_token (public access, no auth required)
  const { data: space, error } = await supabase
    .from("spaces")
    .select("id, share_key, settings, status")
    .eq("view_token", token)
    .single();

  // Fetch screen settings for this space
  const { data: screenSettings } = await supabase
    .from("screen_settings")
    .select("display_mode, background, theme, locale")
    .eq("space_id", space?.id || "")
    .single();

  // Use locale from settings, fallback to Accept-Language header, then 'en'
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";
  const browserLocale = acceptLanguage.startsWith("ja") ? "ja" : "en";
  const locale: LocaleType =
    (screenSettings?.locale as LocaleType) || browserLocale;

  // If token is invalid or space not found, show error
  if (error || !space) {
    const t = await getTranslations({ locale, namespace: "ScreenView" });
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

  // Use settings from database, fallback to defaults
  const initialMode: DisplayMode =
    (screenSettings?.display_mode as DisplayMode) || "full";
  const initialBg: BackgroundType =
    (screenSettings?.background as BackgroundType) || "default";
  const initialTheme: ThemeType =
    (screenSettings?.theme as ThemeType) || "dark";

  // Get base URL for QR code generation
  const baseUrl = getAbsoluteUrl();

  return (
    <ScreenDisplay
      baseUrl={baseUrl}
      initialBg={initialBg}
      initialMode={initialMode}
      initialTheme={initialTheme}
      locale={locale}
      shareKey={space.share_key}
      spaceId={space.id}
    />
  );
}
