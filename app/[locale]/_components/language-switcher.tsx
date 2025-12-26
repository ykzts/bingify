"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeNames: Record<string, string> = {
  en: "English",
  ja: "日本語",
};

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // Navigate to the same pathname with the new locale
      // The middleware will handle setting the NEXT_LOCALE cookie
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="relative inline-block">
      <label className="sr-only" htmlFor="language-select">
        {t("label")}
      </label>
      <div className="relative">
        <Globe
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500"
        />
        <select
          className="appearance-none rounded-md border border-gray-300 bg-white py-2 pr-8 pl-10 font-medium text-gray-700 text-sm transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:hover:border-gray-500"
          disabled={isPending}
          id="language-select"
          onChange={(e) => handleLocaleChange(e.target.value)}
          value={locale}
        >
          {routing.locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeNames[loc] || loc.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            aria-hidden="true"
            className="size-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 9l-7 7-7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
