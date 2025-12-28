import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SystemSettingsForm } from "@/app/[locale]/admin/settings/_components/system-settings-form";
import { getSystemSettings } from "@/app/[locale]/admin/settings/actions";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = useTranslations("AdminSettings");

  const { settings, error } = await getSystemSettings();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">
          {t(`errors.${error}`, { default: t("errors.errorGeneric") })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-lg">
          {t("resourceLimitsTitle")}
        </h3>
        <SystemSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
