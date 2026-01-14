import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Suspense } from "react";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { ConditionalHeader } from "./_components/conditional-header";
import { Footer } from "./_components/footer";
import { HeaderMenuWrapper } from "./_components/header-menu-wrapper";
import { PreReleaseBanner } from "./_components/pre-release-banner";

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
    metadataBase: new URL(getAbsoluteUrl()),
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
    <html lang={locale} suppressHydrationWarning>
      <body className={`${nunito.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ConfirmProvider>
              <div className="flex min-h-screen flex-col">
                <PreReleaseBanner />
                <Suspense fallback={null}>
                  <AnnouncementBanner />
                </Suspense>
                <ConditionalHeader>
                  <header className="sticky top-0 z-50 border-gray-200 border-b bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/80">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4">
                      <HeaderMenuWrapper />
                    </div>
                  </header>
                </ConditionalHeader>
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </ConfirmProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
