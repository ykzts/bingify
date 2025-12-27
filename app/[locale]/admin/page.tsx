import { setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 font-semibold text-lg">管理権限</h2>
          <p className="text-gray-600 text-sm">
            サイト管理者として、すべてのスペースとユーザーを管理できます。
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 font-semibold text-lg">スペース管理</h2>
          <p className="text-gray-600 text-sm">
            すべてのスペースを閲覧・削除できます。
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-2 font-semibold text-lg">ユーザー管理</h2>
          <p className="text-gray-600 text-sm">
            ユーザーをBANして、アカウントを無効化できます。
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="mb-2 font-semibold text-yellow-800">⚠️ 注意事項</h3>
        <ul className="space-y-1 text-sm text-yellow-700">
          <li>• スペースの削除は元に戻せません（アーカイブには保存されます）</li>
          <li>• ユーザーのBANは完全にアカウントを削除します</li>
          <li>• すべての操作は慎重に行ってください</li>
        </ul>
      </div>
    </div>
  );
}
