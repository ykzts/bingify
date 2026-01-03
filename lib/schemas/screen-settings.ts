import { z } from "zod";

export const displayModeSchema = z.enum(["full", "minimal"]);
export const backgroundTypeSchema = z.enum([
  "default",
  "transparent",
  "green",
  "blue",
]);

export const screenSettingsSchema = z.object({
  background: backgroundTypeSchema,
  display_mode: displayModeSchema,
});

export type ScreenSettingsFormData = z.infer<typeof screenSettingsSchema>;
