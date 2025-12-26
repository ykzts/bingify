import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  defaultLocale: "ja",
  localePrefix: "as-needed",
  locales: ["en", "ja"],
});
