"use client";

import {
  AlertCircle,
  ChevronRight,
  InfoIcon,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  dismissAnnouncement,
  getActiveAnnouncements,
  getDismissedAnnouncements,
} from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/types/announcement";

/**
 * システムお知らせバナーコンポーネント
 * ページトップに固定表示され、優先度に基づいて最も重要なお知らせを表示します
 */
export function AnnouncementBanner() {
  const t = useTranslations("Announcements");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncement = async () => {
      setIsLoading(true);
      try {
        // アクティブなお知らせを取得
        const activeResult = await getActiveAnnouncements();

        // エラーハンドリング
        if (!(activeResult.success && activeResult.data)) {
          setIsLoading(false);
          return;
        }

        // 非表示済みお知らせを取得（認証ユーザーのみ）
        const dismissedResult = await getDismissedAnnouncements();
        const dismissedIds = new Set(
          dismissedResult.success ? dismissedResult.data || [] : []
        );

        // 非表示済みを除外し、最高優先度のお知らせを取得
        // getActiveAnnouncements は既に優先度順にソート済み
        const visibleAnnouncement = activeResult.data.find(
          (a) => !dismissedIds.has(a.id)
        );

        if (visibleAnnouncement) {
          setAnnouncement(visibleAnnouncement);
          setIsVisible(true);
        }
      } catch (error) {
        console.error("Failed to load announcement:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncement();
  }, []);

  const handleDismiss = async () => {
    if (!announcement) {
      return;
    }

    // 即座に UI から非表示
    setIsVisible(false);

    try {
      // サーバーに非表示記録を保存
      await dismissAnnouncement(announcement.id);
    } catch (error) {
      console.error("Failed to dismiss announcement:", error);
      // エラーが発生しても UI は非表示のままにする
    }
  };

  // ローディング中または表示するお知らせがない場合は何も表示しない
  if (isLoading || !announcement || !isVisible) {
    return null;
  }

  // 優先度に応じたスタイル設定
  const getVariantStyles = () => {
    switch (announcement.priority) {
      case "error":
        return {
          icon: <AlertCircle className="size-4" />,
          variant: "destructive" as const,
        };
      case "warning":
        return {
          className:
            "border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950 dark:text-amber-50",
          icon: <TriangleAlert className="size-4" />,
          variant: "default" as const,
        };
      default:
        return {
          icon: <InfoIcon className="size-4" />,
          variant: "default" as const,
        };
    }
  };

  const { variant, icon, className } = getVariantStyles();

  return (
    <section
      aria-label="システムお知らせ"
      aria-live="polite"
      className="animate-slide-down-fade-in"
    >
      <Alert className={className} variant={variant}>
        {icon}
        <AlertTitle>{announcement.title}</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-1 font-medium text-sm hover:underline"
            href={`/announcements/${announcement.id}`}
          >
            {t("viewDetails")}
            <ChevronRight className="size-4" />
          </Link>
        </AlertDescription>
        {announcement.dismissible && (
          <Button
            aria-label="お知らせを閉じる"
            className="absolute top-2 right-2 h-6 w-6 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        )}
      </Alert>
    </section>
  );
}
