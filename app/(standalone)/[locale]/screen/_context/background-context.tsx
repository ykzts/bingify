"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type BackgroundType = "default" | "transparent" | "green" | "blue";

interface BackgroundContextType {
  background: BackgroundType;
  setBackground: (bg: BackgroundType) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined
);

export function BackgroundProvider({
  children,
  initialBackground = "default",
}: {
  children: React.ReactNode;
  initialBackground?: BackgroundType;
}) {
  const [background, setBackground] =
    useState<BackgroundType>(initialBackground);

  return (
    <BackgroundContext value={{ background, setBackground }}>
      {children}
    </BackgroundContext>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

export function ColoredHtml({
  children,
  className,
  lang,
}: {
  children?: React.ReactNode;
  className?: string;
  lang: string;
}) {
  const { background } = useBackground();

  return (
    <html
      className={cn(
        "bg-slate-950 data-[background=blue]:bg-chroma-key-blue data-[background=green]:bg-chroma-key-green data-[background=transparent]:bg-transparent",
        className
      )}
      data-background={background}
      lang={lang}
    >
      {children}
    </html>
  );
}
