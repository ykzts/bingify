import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import {
  BackgroundApplier,
  BackgroundProvider,
} from "./_context/background-context";

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito",
});

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Bingify Screen",
  };
}

export default async function ScreenLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${nunito.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <BackgroundProvider>
            <BackgroundApplier />
            {children}
          </BackgroundProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
