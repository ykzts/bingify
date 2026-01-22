import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Suspense } from "react";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { LoginSuccessToast } from "@/components/login-success-toast";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { ConditionalHeader } from "./_components/conditional-header";
import { Footer } from "./_components/footer";
import { HeaderMenuWrapper } from "./_components/header-menu-wrapper";
import { MobileFooterNavWrapper } from "./_components/mobile-footer-nav-wrapper";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

// Regex for parsing Link header URLs - defined at top level for performance
const LINK_URL_REGEX = /<([^>]+)>/;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  // Extract current pathname from headers to build hreflang alternates
  const headersList = await headers();

  // Parse the Link header that next-intl middleware sets
  // Format: <http://localhost:3001/path>; rel="alternate"; hreflang="en", ...
  const linkHeader = headersList.get("link") || "";

  // Extract pathname from the first link (current locale's URL)
  let currentPath = "/";
  const linkMatch = linkHeader.match(LINK_URL_REGEX);
  if (linkMatch) {
    try {
      const url = new URL(linkMatch[1]);
      currentPath = url.pathname;
    } catch {
      // Fallback to root if parsing fails
      currentPath = "/";
    }
  }

  // Remove locale prefix from pathname to get the base path
  let pathWithoutLocale = currentPath;
  for (const loc of routing.locales) {
    const localePrefix = `/${loc}`;
    if (
      currentPath.startsWith(`${localePrefix}/`) ||
      currentPath === localePrefix
    ) {
      pathWithoutLocale = currentPath.slice(localePrefix.length) || "/";
      break;
    }
  }

  // Generate alternate URLs for each locale
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    if (loc === routing.defaultLocale) {
      // Default locale: no prefix
      languages[loc] = pathWithoutLocale;
    } else {
      // Non-default locale: add prefix
      languages[loc] = `/${loc}${pathWithoutLocale}`;
    }
  }

  // x-default should point to the default locale version
  languages["x-default"] = pathWithoutLocale;

  return {
    alternates: {
      languages,
    },
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
                <main className="flex-1 pb-16 md:pb-0">{children}</main>
                <Footer />
                <Suspense fallback={null}>
                  <MobileFooterNavWrapper />
                </Suspense>
              </div>
              <Toaster />
              <Suspense fallback={null}>
                <LoginSuccessToast />
              </Suspense>
            </ConfirmProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
