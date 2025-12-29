import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { cn } from "@/lib/utils";
import {
  BackgroundProvider,
  ColoredHtml,
} from "./screen/_context/background-context";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Bingify Screen",
  };
}

export default async function ScreenLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <BackgroundProvider>
      <ColoredHtml className={cn("antialiased", nunito.variable)} lang={locale}>
        <body className="bg-transparent">
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </ColoredHtml>
    </BackgroundProvider>
  );
}
