"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 正式リリース前であることを示すバナー
 * リポジトリがpublicになった後、正式リリースまでの間表示される
 * NEXT_PUBLIC_SHOW_BETA_BANNER環境変数で表示を制御可能
 */
export function PreReleaseBanner() {
  const t = useTranslations("PreReleaseBanner");
  const showBanner = process.env.NEXT_PUBLIC_SHOW_BETA_BANNER === "true";

  if (!showBanner) {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0" variant="default">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <span>{t("description")}</span>
        <a
          className="text-purple-600 underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          href="https://github.com/ykzts/bingify"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("learnMore")}
        </a>
      </AlertDescription>
    </Alert>
  );
}
