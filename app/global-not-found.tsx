import "./globals.css";
import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routing } from "@/i18n/routing";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "404 Not Found",
};

const LOCALE_COOKIE_REGEX = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/;

type Locale = (typeof routing.locales)[number];

function isValidLocale(locale: string): locale is Locale {
  return routing.locales.some((l) => l === locale);
}

function detectLocaleFromHeaders(headersList: Headers): string {
  // Check for NEXT_LOCALE cookie first (set by middleware)
  const cookie = headersList.get("cookie");
  if (cookie) {
    const localeMatch = cookie.match(LOCALE_COOKIE_REGEX);
    if (localeMatch?.[1]) {
      const locale = localeMatch[1];
      if (isValidLocale(locale)) {
        return locale;
      }
    }
  }

  // Check Accept-Language header
  const acceptLanguage = headersList.get("accept-language");
  if (acceptLanguage) {
    // Parse the Accept-Language header (e.g., "ja,en-US;q=0.9,en;q=0.8")
    const languages = acceptLanguage.split(",").map((lang) => {
      const [locale] = lang.trim().split(";");
      return locale.split("-")[0]; // Get the primary language code
    });

    // Find the first matching locale
    for (const lang of languages) {
      if (isValidLocale(lang)) {
        return lang;
      }
    }
  }

  return routing.defaultLocale;
}

export default async function GlobalNotFound() {
  const headersList = await headers();
  const locale = detectLocaleFromHeaders(headersList);
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return (
    <html lang={locale}>
      <body className={`${nunito.variable} antialiased`}>
        <div className="container mx-auto px-4 py-16">
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <FileQuestion className="h-20 w-20 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>{t("title")}</EmptyTitle>
              <EmptyDescription>{t("description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <a href={`/${locale}`}>{t("backHome")}</a>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </body>
    </html>
  );
}
