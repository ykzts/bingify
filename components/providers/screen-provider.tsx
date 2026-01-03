"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import type { BackgroundType, LocaleType } from "@/lib/types/screen-settings";
import { cn } from "@/lib/utils";

interface ScreenContextType {
  background: BackgroundType;
  locale: LocaleType;
  setBackground: (bg: BackgroundType) => void;
  setLocale: (locale: LocaleType) => void;
}

const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export function ScreenProvider({
  children,
  initialBackground = "default",
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialBackground?: BackgroundType;
  initialLocale?: LocaleType;
}) {
  const [background, setBackground] =
    useState<BackgroundType>(initialBackground);
  const [locale, setLocale] = useState<LocaleType>(initialLocale);

  return (
    <ScreenContext value={{ background, locale, setBackground, setLocale }}>
      {children}
    </ScreenContext>
  );
}

export function useScreen() {
  const context = useContext(ScreenContext);
  if (context === undefined) {
    throw new Error("useScreen must be used within a ScreenProvider");
  }
  return context;
}

export function ScreenHtml({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { background, locale } = useScreen();

  return (
    <html
      className={cn(
        "bg-slate-950 data-[background=blue]:bg-chroma-key-blue data-[background=green]:bg-chroma-key-green data-[background=transparent]:bg-transparent",
        className
      )}
      data-background={background}
      lang={locale}
    >
      {children}
    </html>
  );
}
