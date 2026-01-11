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
  const {
    activeHostedSpaces,
    activeParticipatedSpaces,
    closedHostedSpaces,
    closedParticipatedSpaces,
    draftHostedSpaces,
    error,
  } = await getUserSpaces();

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

      {/* --- SECTION 2: Active Spaces --- */}
      {(activeHostedSpaces.length > 0 ||
        activeParticipatedSpaces.length > 0) && (
        <section className="space-y-4">
          <SectionHeader icon={FileText}>
            {t("activeSectionTitle")}
          </SectionHeader>
          {/* Hosted active spaces */}
          {activeHostedSpaces.map((space) => (
            <div
              className="flex flex-col items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm sm:flex-row"
              key={space.id}
            >
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
                    {space.title || space.share_key}{" "}
                    <span className="text-green-700 text-xs">
                      ({t("activeSpaceLabel")})
                    </span>
                  </p>
                  <p className="flex items-center gap-1 text-green-700 text-xs">
                    <Users className="h-3 w-3" />
                    {t("activeSpaceParticipants", {
                      count: space.participant_count || 0,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  className="w-full rounded border border-green-200 bg-white px-4 py-2 font-bold text-green-700 text-sm shadow-sm transition hover:bg-green-100 sm:w-auto"
                  href={`/dashboard/spaces/${space.id}`}
                >
                  {t("activeSpaceBackToAdmin")}
                </Link>
                {space.is_also_participant && (
                  <Link
                    className="w-full rounded border border-green-200 bg-white px-4 py-2 font-bold text-green-700 text-sm shadow-sm transition hover:bg-green-100 sm:w-auto"
                    href={`/spaces/${space.id}`}
                  >
                    {t("viewSpaceAction")}
                  </Link>
                )}
              </div>
            </div>
          ))}
          {/* Participated active spaces */}
          {activeParticipatedSpaces.map((space) => (
            <div
              className="flex flex-col items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm sm:flex-row"
              key={space.id}
            >
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
                    {space.title || space.share_key}{" "}
                    <span className="text-green-700 text-xs">
                      ({t("activeSpaceLabel")})
                    </span>
                  </p>
                  <p className="flex items-center gap-1 text-green-700 text-xs">
                    <Users className="h-3 w-3" />
                    {t("activeSpaceParticipants", {
                      count: space.participant_count || 0,
                    })}
                  </p>
                </div>
              </div>
              <Link
                className="w-full rounded border border-green-200 bg-white px-4 py-2 font-bold text-green-700 text-sm shadow-sm transition hover:bg-green-100 sm:w-auto"
                href={`/spaces/${space.id}`}
              >
                {t("viewSpaceAction")}
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* --- SECTION 3: Draft Spaces --- */}
      <section>
        <SectionHeader icon={FileText}>{t("draftSectionTitle")}</SectionHeader>
        {draftHostedSpaces.length === 0 ? (
          <div className="overflow-hidden rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm">{t("draftSpacesEmpty")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    {t("historySpaceName")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("historyStatus")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("historyDate")}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("spaceActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {draftHostedSpaces.map((space) => (
                  <tr
                    className="transition-colors hover:bg-gray-50"
                    key={space.id}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        className="transition-colors hover:text-purple-600"
                        href={`/dashboard/spaces/${space.id}`}
                      >
                        {space.title || space.share_key}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 font-medium text-xs text-yellow-800">
                        {t("statusDraft")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {space.created_at
                        ? new Date(space.created_at).toLocaleDateString(locale)
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-gray-700 text-sm shadow-sm transition hover:bg-gray-50"
                        href={`/dashboard/spaces/${space.id}`}
                      >
                        {t("manageAction")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- SECTION 4: Past History (Closed) --- */}
      {(closedHostedSpaces.length > 0 ||
        closedParticipatedSpaces.length > 0) && (
        <section>
          <SectionHeader icon={FileText}>
            {t("closedSectionTitle")}
          </SectionHeader>
          <SpaceTabs
            hostedSpaces={closedHostedSpaces}
            hostedTabLabel={t("hostedSpacesPastTab")}
            locale={locale}
            participatedSpaces={closedParticipatedSpaces}
            participatedTabLabel={t("participatedSpacesPastTab")}
          />
        </section>
      )}
    </div>
  );
}
