import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <SettingsNav locale={locale} />
      {children}
    </div>
  );
}

function SettingsNav({ locale }: { locale: string }) {
  const t = useTranslations("AdminSettings");

  return (
    <nav className="mb-6 border-gray-200 border-b">
      <ul className="flex gap-4">
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-3 text-sm hover:border-purple-500"
            href={`/${locale}/admin/settings/general`}
          >
            {t("generalTitle")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-3 text-sm hover:border-purple-500"
            href={`/${locale}/admin/settings/resource-limits`}
          >
            {t("resourceLimitsTitle")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-3 text-sm hover:border-purple-500"
            href={`/${locale}/admin/settings/expiration-archive`}
          >
            {t("expirationArchiveTitle")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-3 text-sm hover:border-purple-500"
            href={`/${locale}/admin/settings/auth-providers`}
          >
            {t("authProvidersTitle")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
