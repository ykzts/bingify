"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SpaceAnnouncementForm } from "@/app/[locale]/spaces/[id]/_components/space-announcement-form";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  deleteSpaceAnnouncement,
  type GetSpaceAnnouncementsResult,
  getSpaceAnnouncements,
  type SpaceAnnouncementWithDetails,
} from "@/lib/actions/space-announcements";

interface SpaceAnnouncementManagementProps {
  spaceId: string;
}

/**
 * スペースお知らせ管理コンポーネント（ダッシュボード用）
 * お知らせの作成・編集・削除機能を提供
 */
export function SpaceAnnouncementManagement({
  spaceId,
}: SpaceAnnouncementManagementProps) {
  const t = useTranslations("SpaceAnnouncement");
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<
    SpaceAnnouncementWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<SpaceAnnouncementWithDetails | null>(null);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const result: GetSpaceAnnouncementsResult =
        await getSpaceAnnouncements(spaceId);
      if (result.success && result.data) {
        setAnnouncements(result.data);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
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
        toast.error(result.error || t("errorGeneric"));
      }
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      toast.error(t("errorGeneric"));
    }
  };

  const handleEdit = (announcement: SpaceAnnouncementWithDetails) => {
    setEditingAnnouncement(announcement);
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingAnnouncement(null);
    loadAnnouncements();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">{t("title")}</h2>
        <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("createButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <SpaceAnnouncementForm
              onSuccess={handleFormSuccess}
              spaceId={spaceId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
          {t("loading")}...
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 text-sm">
          {t("emptyMessage")}
        </div>
      )}

      {!loading && announcements.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  {t("titleLabel")}
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                  {t("statusLabel")}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                  {t("actionsLabel")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {announcements.map((announcement) => (
                <tr key={announcement.announcement_id}>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900 text-sm">
                    {announcement.announcements.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {announcement.pinned && (
                      <span className="rounded-full bg-purple-100 px-2 py-1 font-medium text-purple-800 text-xs">
                        {t("pinnedLabel")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <Dialog
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingAnnouncement(null);
                          }
                        }}
                        open={
                          editingAnnouncement?.announcement_id ===
                          announcement.announcement_id
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => handleEdit(announcement)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                          <SpaceAnnouncementForm
                            announcement={editingAnnouncement ?? undefined}
                            onSuccess={handleFormSuccess}
                            spaceId={spaceId}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        onClick={() =>
                          handleDelete(announcement.announcement_id)
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
