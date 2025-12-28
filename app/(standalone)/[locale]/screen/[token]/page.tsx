import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ScreenDisplay } from "./_components/screen-display";

interface Props {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ bg?: string; mode?: string }>;
}

export default async function ScreenViewPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  const rawSearchParams = await searchParams;

  // Validate query parameters
  const ALLOWED_MODES = ["full", "minimal"] as const;
  const ALLOWED_BGS = ["default", "transparent", "green", "blue"] as const;

  const mode =
    typeof rawSearchParams.mode === "string" &&
    ALLOWED_MODES.includes(
      rawSearchParams.mode as (typeof ALLOWED_MODES)[number]
    )
      ? rawSearchParams.mode
      : "full";

  const bg =
    typeof rawSearchParams.bg === "string" &&
    ALLOWED_BGS.includes(rawSearchParams.bg as (typeof ALLOWED_BGS)[number])
      ? rawSearchParams.bg
      : "default";

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

  // Get base URL from headers for QR code generation
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  return (
    <ScreenDisplay
      baseUrl={baseUrl}
      initialBg={bg}
      initialMode={mode}
      locale={locale}
      shareKey={space.share_key}
      spaceId={space.id}
    />
  );
}
