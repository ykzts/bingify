import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { routing } from "@/i18n/routing";
import { Footer } from "./_components/footer";
import { HeaderMenuWrapper } from "./_components/header-menu-wrapper";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    description: t("description"),
    title: {
      default: t("title"),
      template: "%s | Bingify",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${nunito.variable} antialiased`}>
        <QueryProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="flex min-h-screen flex-col">
              <header className="fixed top-4 right-4 z-50">
                <HeaderMenuWrapper />
              </header>
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
