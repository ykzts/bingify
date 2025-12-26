import { getRequestConfig } from "next-intl/server";
import enMessages from "../messages/en.json";
import jaMessages from "../messages/ja.json";
import { routing } from "./routing";

const messages = {
  en: enMessages,
  ja: jaMessages,
} as const;

type Locale = keyof typeof messages;

function isValidLocale(locale: string | undefined): locale is Locale {
  return locale !== undefined && (locale === "en" || locale === "ja");
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  const validLocale = isValidLocale(locale) ? locale : routing.defaultLocale;

  return {
    locale: validLocale,
    messages: messages[validLocale],
  };
});
