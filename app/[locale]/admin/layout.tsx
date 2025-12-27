import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto p-6">
      <AdminHeader />
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}

function AdminHeader() {
  const t = useTranslations("Admin");

  return (
    <div className="mb-8">
      <h1 className="font-bold text-3xl">{t("dashboardTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>
    </div>
  );
}

function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations("Admin");

  return (
    <nav className="mb-8 border-gray-200 border-b">
      <ul className="flex gap-6">
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin`}
          >
            {t("navOverview")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/spaces`}
          >
            {t("navSpaces")}
          </Link>
        </li>
        <li>
          <Link
            className="inline-block border-transparent border-b-2 pb-4 hover:border-blue-500"
            href={`/${locale}/admin/users`}
          >
            {t("navUsers")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
