import { AlertCircle, InfoIcon, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FormattedText } from "@/components/formatted-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getAnnouncementById } from "@/lib/actions/announcements";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/announcements/[id]">): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "Announcements" });

  // お知らせを取得してタイトルを使用
  const result = await getAnnouncementById(id);

  const title =
    result.success && result.data ? result.data.title : t("metaTitle");

  return {
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      title,
    },
    title,
  };
}

export default async function AnnouncementDetailPage({
  params,
}: PageProps<"/[locale]/announcements/[id]">) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Announcements");

  // お知らせを取得
  const result = await getAnnouncementById(id);

  // お知らせが見つからない場合は404
  if (!(result.success && result.data)) {
    notFound();
  }

  const announcement = result.data;

  // 優先度に応じたスタイル設定
  const getVariantStyles = () => {
    switch (announcement.priority) {
      case "error":
        return {
          icon: <AlertCircle className="size-4" />,
          label: t("priority.error"),
          variant: "destructive" as const,
        };
      case "warning":
        return {
          className:
            "border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950 dark:text-amber-50",
          icon: <TriangleAlert className="size-4" />,
          label: t("priority.warning"),
          variant: "default" as const,
        };
      default:
        return {
          icon: <InfoIcon className="size-4" />,
          label: t("priority.info"),
          variant: "default" as const,
        };
    }
  };

  const { variant, icon, className, label } = getVariantStyles();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </div>

      <div className="space-y-6">
        {/* お知らせ本体 */}
        <Alert className={className} variant={variant}>
          {icon}
          <AlertTitle className="text-lg">{announcement.title}</AlertTitle>
          <AlertDescription className="mt-4 text-base">
            <FormattedText text={announcement.content} />
          </AlertDescription>
        </Alert>

        {/* メタ情報 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-600 dark:text-gray-400">
                {t("priority.label")}
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">{label}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-600 dark:text-gray-400">
                {t("createdAt")}
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {new Date(announcement.created_at).toLocaleString(locale, {
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* トップに戻るボタン */}
        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">{t("backToTop")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
