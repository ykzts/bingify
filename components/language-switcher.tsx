"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const localeNames: Record<string, string> = {
  en: "English",
  ja: "日本語",
};

export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("label")}
          size="icon"
          type="button"
          variant="outline"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {routing.locales.map((loc) => (
            <DropdownMenuItem
              className={cn(
                "cursor-pointer",
                locale === loc && "bg-accent font-medium"
              )}
              disabled={isPending}
              key={loc}
              onSelect={() => handleLocaleChange(loc)}
            >
              {localeNames[loc] || loc.toUpperCase()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
