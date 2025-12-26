import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: "Terms of Service - Bingify",
    ja: "利用規約 - Bingify",
  };

  return {
    title: titles[locale] || titles.en,
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const TermsContent = await import(`@/content/${locale}/terms.mdx`).then(
    (mod) => mod.default
  );

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="prose prose-slate lg:prose-lg mx-auto">
          <TermsContent />
        </div>
      </div>
    </div>
  );
}
