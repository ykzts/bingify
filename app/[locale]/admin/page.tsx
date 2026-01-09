import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function AdminPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <OverviewCards />
      <WarningSection />
    </div>
  );
}

function OverviewCards() {
  const t = useTranslations("Admin");

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-2 font-semibold text-lg">
          {t("overviewCommunityCard")}
        </h2>
        <p className="text-gray-600 text-sm">
          {t("overviewCommunityDescription")}
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-2 font-semibold text-lg">
          {t("overviewSpacesCard")}
        </h2>
        <p className="text-gray-600 text-sm">
          {t("overviewSpacesDescription")}
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-2 font-semibold text-lg">{t("overviewUsersCard")}</h2>
        <p className="text-gray-600 text-sm">{t("overviewUsersDescription")}</p>
      </div>
    </div>
  );
}

function WarningSection() {
  const t = useTranslations("Admin");

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-yellow-800">
        <AlertTriangle aria-hidden="true" className="size-5" />
        {t("overviewWarningTitle")}
      </h3>
      <ul className="space-y-1 text-sm text-yellow-700">
        <li>{t("overviewWarningNote1")}</li>
        <li>{t("overviewWarningNote2")}</li>
        <li>{t("overviewWarningNote3")}</li>
      </ul>
    </div>
  );
}
