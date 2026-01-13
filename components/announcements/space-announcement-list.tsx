"use client";

import { AlertCircle, Edit, Pin, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormattedText } from "@/components/formatted-text";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteSpaceAnnouncement,
  type GetSpaceAnnouncementsResult,
  getSpaceAnnouncements,
  type SpaceAnnouncementWithDetails,
} from "@/lib/actions/space-announcements";
import { cn } from "@/lib/utils";

interface SpaceAnnouncementListProps {
  spaceId: string;
  /** 現在のユーザーがオーナーまたは管理者かどうか */
  isAdmin: boolean;
}

/**
 * スペースお知らせ一覧コンポーネント
 * スペース固有のお知らせを表示し、管理機能を提供します
 */
export function SpaceAnnouncementList({
  spaceId,
  isAdmin,
}: SpaceAnnouncementListProps) {
  const t = useTranslations("SpaceAnnouncement");
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<
    SpaceAnnouncementWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const result: GetSpaceAnnouncementsResult =
        await getSpaceAnnouncements(spaceId);
      if (result.success && result.data) {
        setAnnouncements(result.data);
      } else {
        setError(result.error || "Failed to load announcements");
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: spaceIdが変更されたときのみ再読み込み
  useEffect(() => {
    loadAnnouncements();
  }, [spaceId]);

  const handleDelete = async (announcementId: string) => {
    const confirmed = await confirm({
      description: t("deleteConfirm"),
      variant: "destructive",
    });
    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteSpaceAnnouncement(spaceId, announcementId);
      if (result.success) {
        toast.success(t("deleteSuccess"));
        loadAnnouncements();
      } else {
        toast.error(result.error || "Failed to delete announcement");
      }
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const handleEdit = (announcementId: string) => {
    // TODO: Navigate to edit page or open edit dialog
    // For now, we'll just log the action
    console.log("Edit announcement:", announcementId);
  };

  const handleManage = () => {
    // TODO: Navigate to announcement management page
    console.log("Manage announcements");
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{t("title")}</h2>
        </div>
        <div className="space-y-4">
          {["skeleton-1", "skeleton-2"].map((key) => (
            <Card className="animate-pulse" key={key}>
              <CardHeader>
                <div className="h-6 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/3 rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-20 w-full rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (announcements.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{t("title")}</h2>
          {isAdmin && (
            <Button onClick={handleManage} size="sm" variant="outline">
              {t("manageButton")}
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-sm">{t("emptyMessage")}</p>
            <p className="mt-1 text-muted-foreground text-xs">
              {t("emptyMessageDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        {isAdmin && (
          <Button onClick={handleManage} size="sm" variant="outline">
            {t("manageButton")}
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {announcements.map((announcement) => {
          const isPinned = announcement.pinned;
          const announcementData = announcement.announcements;

          return (
            <Card
              className={cn(
                "transition-colors",
                isPinned &&
                  "border-2 border-primary bg-primary/5 dark:bg-primary/10"
              )}
              key={announcement.announcement_id}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {isPinned && (
                        <Pin className="size-5 shrink-0 text-primary" />
                      )}
                      <span className="break-words">
                        {announcementData.title}
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {new Date(announcementData.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        aria-label={t("editButton")}
                        onClick={() => handleEdit(announcement.announcement_id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        aria-label={t("deleteButton")}
                        onClick={() =>
                          handleDelete(announcement.announcement_id)
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <FormattedText
                  className="text-sm"
                  text={announcementData.content}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
