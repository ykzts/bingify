import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllSpaces } from "../_actions/admin-operations";
import { SpaceList } from "../_components/space-list";

export const dynamic = "force-dynamic";

export default async function AdminSpacesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/spaces">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const currentPage = Number(query?.page) || 1;

  const t = await getTranslations("Admin");
  const { error, hasMore, spaces } = await getAllSpaces(currentPage);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">{t(error)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("spacesTitle")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("spacesCount", { count: spaces?.length || 0 })}
        </p>
      </div>

      <SpaceList
        currentPage={currentPage}
        hasMore={hasMore}
        initialSpaces={spaces || []}
      />
    </div>
  );
}
