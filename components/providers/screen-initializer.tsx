"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import type { BackgroundType, LocaleType } from "@/lib/types/screen-settings";
import { useScreen } from "./screen-provider";

interface Props {
  children: ReactNode;
  initialBackground: BackgroundType;
  initialLocale: LocaleType;
}

export function ScreenInitializer({
  children,
  initialBackground,
  initialLocale,
}: Props) {
  const { setBackground, setLocale } = useScreen();

  useEffect(() => {
    setBackground(initialBackground);
    setLocale(initialLocale);
  }, [initialBackground, initialLocale, setBackground, setLocale]);

  return <>{children}</>;
}
