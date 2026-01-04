import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { Footer } from "./_components/footer";
import { HeaderMenu } from "./_components/header-menu";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

export async function generateStaticParams() {
  // Return locale params but routes will still be dynamic at runtime
  // This satisfies Cache Components' requirement for at least one static param
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
                <header className="fixed top-4 right-4 z-50">
                  <HeaderMenu />
                </header>
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
