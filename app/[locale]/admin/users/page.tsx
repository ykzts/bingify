import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserList } from "../_components/user-list";
import { getAllUsers } from "../_lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
}: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const { error, users } = await getAllUsers();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{t(error)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("usersTitle")}</h2>
        <p className="mt-2 text-gray-600">
          {t("usersCount", { count: users?.length || 0 })}
        </p>
      </div>

      <UserList initialUsers={users || []} />
    </div>
  );
}
