"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-border border-t bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm md:justify-start">
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/"
            >
              {t("backToHome")}
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/contact"
            >
              {t("contact")}
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/terms"
            >
              {t("terms")}
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/privacy"
            >
              {t("privacy")}
            </Link>
            <a
              aria-label={`${t("sourceCode")} (MIT, opens in a new window)`}
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="https://github.com/ykzts/bingify"
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("sourceCode")} (MIT)
            </a>
          </nav>
          <div className="flex items-center justify-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
