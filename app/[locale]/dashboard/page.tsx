import { FileText, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeader } from "@/components/section-header";
import { Link } from "@/i18n/navigation";
import { getUserSpaces } from "./_actions/space-management";
import { CreateSpaceForm } from "./_components/create-space-form";
import { SpaceTabs } from "./_components/space-tabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return {
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      title: t("metaTitle"),
    },
    title: t("metaTitle"),
  };
}

export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Dashboard");
  const { activeSpace, hostedSpaces, participatedSpaces, error } =
    await getUserSpaces();

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-8">
      {/* --- SECTION 1: Create Form --- */}
      <section>
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-gray-900">
            {t("createFormTitle")}
          </h1>
          <p className="text-gray-500 text-sm">{t("createFormDescription")}</p>
        </div>

        {/* Form area with card style */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <CreateSpaceForm />
        </div>
      </section>

      {/* --- Divider --- */}
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-gray-200 border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-2 text-gray-500 text-sm">
            {t("dividerText")}
          </span>
        </div>
      </div>

      {/* Show error if data fetch failed */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* --- SECTION 2: Active Space (conditional) --- */}
      {activeSpace && (
        <section className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm sm:flex-row">
            <div className="flex items-center gap-4">
              {/* Pulse Animation Icon */}
              <span
                aria-hidden="true"
                className="relative flex h-3 w-3"
                title="Active space indicator"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <div>
                <p className="font-bold text-green-900">
                  {activeSpace.share_key}{" "}
                  <span className="text-green-700 text-xs">
                    ({t("activeSpaceLabel")})
                  </span>
                </p>
                <p className="flex items-center gap-1 text-green-700 text-xs">
                  <Users className="h-3 w-3" />
                  {t("activeSpaceParticipants", {
                    count: activeSpace.participant_count || 0,
                  })}
                </p>
              </div>
            </div>
            <Link
              className="w-full rounded border border-green-200 bg-white px-4 py-2 font-bold text-green-700 text-sm shadow-sm transition hover:bg-green-100 sm:w-auto"
              href={`/dashboard/spaces/${activeSpace.id}`}
            >
              {t("activeSpaceBackToAdmin")}
            </Link>
          </div>
        </section>
      )}

      {/* --- SECTION 3: History --- */}
      <section>
        <SectionHeader icon={FileText}>{t("historyTitle")}</SectionHeader>
        <SpaceTabs
          hostedSpaces={hostedSpaces}
          locale={locale}
          participatedSpaces={participatedSpaces}
        />
      </section>
    </div>
  );
}
