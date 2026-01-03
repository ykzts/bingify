import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import type { ReactNode } from "react";
import {
  ColoredHtml,
  ScreenProvider,
} from "@/components/providers/screen-provider";
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

export default async function StandaloneLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ScreenProvider>
      <ColoredHtml className={cn("antialiased", nunito.variable)}>
        <body className="bg-transparent">{children}</body>
      </ColoredHtml>
    </ScreenProvider>
  );
}
