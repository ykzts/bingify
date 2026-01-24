import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { generateAlternateLanguages } from "@/lib/utils/url";
import { ContactForm } from "./_components/contact-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  return {
    alternates: {
      canonical: "/contact",
      languages: generateAlternateLanguages("/contact"),
    },
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      title: t("metaTitle"),
    },
    title: t("metaTitle"),
  };
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-4 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <ContactForm locale={locale} />
    </div>
  );
}
