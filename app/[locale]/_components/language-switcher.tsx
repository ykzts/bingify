"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-gray-500"
        />
        <Select
          disabled={isPending}
          onValueChange={handleLocaleChange}
          value={locale}
        >
          <SelectTrigger className="pl-10" id="language-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {routing.locales.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {localeNames[loc] || loc.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
