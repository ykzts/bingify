import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import {
  BackgroundProvider,
  ColoredHtml,
} from "@/components/providers/background-provider";
import { cn } from "@/lib/utils";

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
}: {
  children: React.ReactNode;
}) {
  // Detect locale from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";
  const locale = acceptLanguage.startsWith("ja") ? "ja" : "en";

  const messages = await getMessages({ locale });

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
