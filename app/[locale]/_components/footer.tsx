import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-gray-200 border-t bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link
            className="text-gray-600 transition-colors hover:text-gray-900"
            href="/"
          >
            {t("backToHome")}
          </Link>
          <Link
            className="text-gray-600 transition-colors hover:text-gray-900"
            href="/terms"
          >
            {t("terms")}
          </Link>
          <Link
            className="text-gray-600 transition-colors hover:text-gray-900"
            href="/privacy"
          >
            {t("privacy")}
          </Link>
          <a
            aria-label={`${t("sourceCode")} (MIT, opens in a new window)`}
            className="text-gray-600 transition-colors hover:text-gray-900"
            href="https://github.com/ykzts/bingify"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("sourceCode")} (MIT)
          </a>
        </nav>
      </div>
    </footer>
  );
}
