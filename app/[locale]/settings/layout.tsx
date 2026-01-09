import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsTabs } from "./_components/settings-tabs";

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AccountSettings");

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="mb-6 font-bold text-3xl">{t("title")}</h1>
        <SettingsTabs />
      </div>

      {children}
    </div>
  );
}
