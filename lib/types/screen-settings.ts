import type { Database } from "@/types/supabase";

export type ScreenSettings =
  Database["public"]["Tables"]["screen_settings"]["Row"];

export type DisplayMode = "full" | "minimal";
export type BackgroundType = "default" | "transparent" | "green" | "blue";
export type ThemeType = "light" | "dark";
export type LocaleType = "en" | "ja";

export interface ScreenSettingsFormData {
  background: BackgroundType;
  display_mode: DisplayMode;
  locale?: LocaleType;
  theme: ThemeType;
}
