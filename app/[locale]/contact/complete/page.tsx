import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact/complete">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  return {
    description: t("completeMetaDescription"),
    title: t("completeMetaTitle"),
  };
}

export default async function ContactCompletePage({
  params,
  searchParams,
}: PageProps<"/[locale]/contact/complete">) {
  const { locale } = await params;
  const { email } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("Contact");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-4 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <div className="w-full max-w-2xl rounded-lg border bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="mb-4 font-bold text-3xl dark:text-gray-100">
          {t("completeTitle")}
        </h1>

        <p className="mb-8 text-gray-600 dark:text-gray-400">
          {t("completeMessage")}
        </p>

        {email && (
          <div className="mb-8 rounded-lg bg-purple-50 p-6 dark:bg-purple-900/20">
            <p className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">
              {t("completeEmailNote")}
            </p>
            <p className="break-all font-bold text-2xl text-purple-600 dark:text-purple-400">
              {email}
            </p>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href={`/${locale}`}>{t("backToHome")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/contact`}>{t("sendAnother")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
