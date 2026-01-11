"use client";

import { createContext, useContext } from "react";

interface SettingsFormContextType {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack Form types are complex and internal
  form: any;
  isSubmitting: boolean;
}

export const SettingsFormContext = createContext<
  SettingsFormContextType | undefined
>(undefined);

export function useSettingsForm() {
  const context = useContext(SettingsFormContext);
  if (!context) {
    throw new Error(
      "useSettingsForm must be used within a SettingsFormWrapper"
    );
  }
  return context;
}
