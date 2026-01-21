import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllUsers } from "../_actions/admin-operations";
import { UserList } from "../_components/user-list";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const currentPage = Number(query?.page) || 1;

  const t = await getTranslations("Admin");
  const { currentUserId, error, hasMore, users } =
    await getAllUsers(currentPage);

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
        <h2 className="font-bold text-2xl">{t("usersTitle")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("usersCount", { count: users?.length || 0 })}
        </p>
      </div>

      <UserList
        currentPage={currentPage}
        currentUserId={currentUserId}
        hasMore={hasMore}
        initialUsers={users || []}
      />
    </div>
  );
}
