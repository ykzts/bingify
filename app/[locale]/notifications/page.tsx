import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NotificationList } from "./_components/notification-list";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/notifications">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Notifications" });

  return {
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      title: t("metaTitle"),
    },
    title: t("metaTitle"),
  };
}

export default async function NotificationsPage({
  params,
}: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Notifications");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900">{t("title")}</h1>
      </div>

      <NotificationList locale={locale} />
    </div>
  );
}
