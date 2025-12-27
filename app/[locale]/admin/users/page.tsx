import { setRequestLocale } from "next-intl/server";
import { getAllUsers } from "../actions";
import { UserList } from "./user-list";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { error, users } = await getAllUsers();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">エラー: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">ユーザー管理</h2>
        <p className="mt-2 text-gray-600">全{users?.length || 0}名のユーザー</p>
      </div>

      <UserList initialUsers={users || []} />
    </div>
  );
}
