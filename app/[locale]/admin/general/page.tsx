import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSystemSettings } from "@/lib/data/system-settings";
import { GeneralSettingsForm } from "../settings/_components/general-settings-form";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage({
  params,
}: PageProps<"/[locale]/admin/general">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSettings");

  const { settings, error, warnings } = await getSystemSettings();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">
          {t(error, { default: t("errorGeneric") })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("generalTitle")}</h2>
        <p className="mt-2 text-gray-600">{t("generalDescription")}</p>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800">
            {t("warningInvalidFields")}
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            {t("warningInvalidFieldsDescription", {
              fields: warnings.join(", "),
            })}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <GeneralSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
