import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllAnnouncements } from "./_actions/announcements";
import { AnnouncementList } from "./_components/announcement-list";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/announcements">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const currentPage = Number(query?.page) || 1;

  const t = await getTranslations("Admin");
  const { announcements, error, hasMore } =
    await getAllAnnouncements(currentPage);

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
        <h2 className="font-bold text-2xl">{t("announcementsTitle")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("announcementsCount", { count: announcements?.length || 0 })}
        </p>
      </div>

      <AnnouncementList
        currentPage={currentPage}
        hasMore={hasMore}
        initialAnnouncements={announcements || []}
      />
    </div>
  );
}
