import { z } from "zod";

export const displayModeSchema = z.enum(["full", "minimal"]);
export const backgroundTypeSchema = z.enum([
  "default",
  "transparent",
  "green",
  "blue",
]);
export const themeSchema = z.enum(["light", "dark"]);
export const localeSchema = z.enum(["en", "ja"]);

export const screenSettingsSchema = z.object({
  background: backgroundTypeSchema,
  display_mode: displayModeSchema,
  locale: localeSchema.optional(),
  theme: themeSchema,
});

export type ScreenSettingsFormData = z.infer<typeof screenSettingsSchema>;
