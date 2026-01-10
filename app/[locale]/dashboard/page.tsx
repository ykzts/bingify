import { FileText, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeader } from "@/components/section-header";
import { Link } from "@/i18n/navigation";
import { formatDateShort } from "@/lib/utils/date-format";
import { getUserSpaces } from "./_actions/space-management";
import { CreateSpaceForm } from "./_components/create-space-form";
import { SpaceActionsDropdown } from "./_components/space-actions-dropdown";
import { StatusBadge } from "./_components/status-badge";

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

  // Combine hosted and participated spaces for display
  const spaces = [...hostedSpaces, ...participatedSpaces];

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
        {spaces.length === 0 ? (
          <div className="overflow-hidden rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm">{t("historyNoSpaces")}</p>
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
                {spaces.map((space) => (
                  <tr
                    className="transition-colors hover:bg-gray-50"
                    key={space.id}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        className="flex flex-col gap-1 transition-colors hover:text-purple-600"
                        href={`/dashboard/spaces/${space.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {space.share_key}
                          {space.is_owner === false && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 text-xs">
                              {t("adminBadge")}
                            </span>
                          )}
                        </div>
                        {space.status === "active" &&
                          space.participant_count !== undefined && (
                            <p className="flex items-center gap-1 text-gray-500 text-xs">
                              <Users className="h-3 w-3" />
                              {t("activeSpaceParticipants", {
                                count: space.participant_count || 0,
                              })}
                            </p>
                          )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={(() => {
                          if (space.status === "active") {
                            return t("statusActive");
                          }
                          if (space.status === "draft") {
                            return t("statusDraft");
                          }
                          return t("statusClosed");
                        })()}
                        status={space.status || "closed"}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateShort(space.created_at || 0, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SpaceActionsDropdown space={space} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
