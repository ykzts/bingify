import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getMDXMetadata, MDXContent } from "@/lib/components/mdx-content";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  return getMDXMetadata(locale, "privacy");
}

export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MDXContent contentPath="privacy" locale={locale} />;
}
