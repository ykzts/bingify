import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSmtpSettings } from "@/lib/data/smtp-settings";
import { SmtpSettingsForm } from "./_components/smtp-settings-form";

export const dynamic = "force-dynamic";

export default async function MailSettingsPage({
  params,
}: PageProps<"/[locale]/admin/mail">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSmtp");

  const { settings, error } = await getSmtpSettings();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("mailTitle")}</h2>
        <p className="mt-2 text-gray-600">{t("mailDescription")}</p>
      </div>

      {!settings && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-800">{t("noSettingsTitle")}</p>
          <p className="mt-1 text-blue-700 text-sm">
            {t("noSettingsDescription")}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <SmtpSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
