"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}

// Client component that applies background color to html element
export function BackgroundApplier() {
  const { background } = useBackground();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    let bgColor = "#020617"; // slate-950
    if (background === "transparent") {
      bgColor = "transparent";
    } else if (background === "green") {
      bgColor = "#00FF00";
    } else if (background === "blue") {
      bgColor = "#0000FF";
    }

    // Store original values
    const originalHtmlBg = html.style.backgroundColor;
    const originalBodyBg = body.style.backgroundColor;

    // Apply background
    html.style.backgroundColor = bgColor;
    body.style.backgroundColor = bgColor;

    // Cleanup on unmount
    return () => {
      html.style.backgroundColor = originalHtmlBg;
      body.style.backgroundColor = originalBodyBg;
    };
  }, [background]);

  return null;
}
