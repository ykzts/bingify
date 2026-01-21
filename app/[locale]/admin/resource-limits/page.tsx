import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSystemSettings } from "@/lib/data/system-settings";
import { ResourceLimitsForm } from "./_components/resource-limits-form";

export const dynamic = "force-dynamic";

export default async function ResourceLimitsPage({
  params,
}: PageProps<"/[locale]/admin/resource-limits">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSettings");

  const { settings, error, warnings } = await getSystemSettings();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">
          {t(error, { default: t("errorGeneric") })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("resourceLimitsTitle")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t("resourceLimitsDescription")}</p>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="font-medium text-yellow-800 dark:text-yellow-400">
            {t("warningInvalidFields")}
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {t("warningInvalidFieldsDescription", {
              fields: warnings.join(", "),
            })}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <ResourceLimitsForm initialSettings={settings} />
      </div>
    </div>
  );
}
