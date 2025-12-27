import { setRequestLocale } from "next-intl/server";
import { getAllSpaces } from "../actions";
import { SpaceList } from "./space-list";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminSpacesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { spaces, error } = await getAllSpaces();

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
        <h2 className="font-bold text-2xl">スペース管理</h2>
        <p className="mt-2 text-gray-600">
          全{spaces?.length || 0}件のスペース
        </p>
      </div>

      <SpaceList initialSpaces={spaces || []} />
    </div>
  );
}
