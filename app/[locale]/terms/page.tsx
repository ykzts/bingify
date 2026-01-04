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
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  return getMDXMetadata(locale, "terms");
}

export default async function TermsPage({
  params,
}: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MDXContent contentPath="terms" locale={locale} />;
}
