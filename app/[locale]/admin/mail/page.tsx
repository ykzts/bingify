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

  const {
    settings,
    error,
    isSmtpHostSetInEnv,
    isSmtpPortSetInEnv,
    isSmtpUserSetInEnv,
    isSmtpPasswordSetInEnv,
    isSmtpSecureSetInEnv,
    isMailFromSetInEnv,
  } = await getSmtpSettings();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("mailTitle")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("mailDescription")}
        </p>
      </div>

      {!settings && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="font-medium text-blue-800 dark:text-blue-400">
            {t("noSettingsTitle")}
          </p>
          <p className="mt-1 text-blue-700 text-sm dark:text-blue-300">
            {t("noSettingsDescription")}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <SmtpSettingsForm
          initialSettings={settings}
          isMailFromSetInEnv={isMailFromSetInEnv}
          isSmtpHostSetInEnv={isSmtpHostSetInEnv}
          isSmtpPasswordSetInEnv={isSmtpPasswordSetInEnv}
          isSmtpPortSetInEnv={isSmtpPortSetInEnv}
          isSmtpSecureSetInEnv={isSmtpSecureSetInEnv}
          isSmtpUserSetInEnv={isSmtpUserSetInEnv}
        />
      </div>
    </div>
  );
}
