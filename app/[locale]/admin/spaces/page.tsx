import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpaceList } from "../_components/space-list";
import { getAllSpaces } from "../actions";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminSpacesPage({ params }: Props) {
  "use cache: private";
  
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const { error, spaces } = await getAllSpaces();

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
        <h2 className="font-bold text-2xl">{t("spacesTitle")}</h2>
        <p className="mt-2 text-gray-600">
          {t("spacesCount", { count: spaces?.length || 0 })}
        </p>
      </div>

      <SpaceList initialSpaces={spaces || []} />
    </div>
  );
}
