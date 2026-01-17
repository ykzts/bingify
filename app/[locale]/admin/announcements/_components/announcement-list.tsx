"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils/date-format";
import type { Tables } from "@/types/supabase";
import { deleteAnnouncementAction } from "../_actions/announcements";
import { AnnouncementForm } from "./announcement-form";

interface AnnouncementListProps {
  currentPage: number;
  hasMore?: boolean;
  initialAnnouncements: Tables<"announcements">[];
}

export function AnnouncementList({
  currentPage,
  hasMore,
  initialAnnouncements,
}: AnnouncementListProps) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const confirm = useConfirm();
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Tables<"announcements"> | null>(null);
  const [editingTranslation, setEditingTranslation] =
    useState<Tables<"announcements"> | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editDialogId, setEditDialogId] = useState<string | null>(null);

  const handleDelete = async (announcementId: string) => {
    if (
      !(await confirm({
        description: t("announcementDeleteConfirm"),
        title: t("deleteAction"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setDeleting(announcementId);
    const result = await deleteAnnouncementAction(announcementId);

    if (result.success) {
      setAnnouncements((prev) =>
        prev.filter((announcement) => announcement.id !== announcementId)
      );
      toast.success(t("announcementDeleteSuccess"));
    } else {
      toast.error(t(result.error || "errorGeneric"));
    }

    setDeleting(null);
  };

  const handleEdit = async (announcement: Tables<"announcements">) => {
    setEditingAnnouncement(announcement);
    setEditDialogId(announcement.id);

    // Fetch translation data
    const { getAnnouncementWithTranslations } = await import(
      "../_actions/announcements"
    );
    const result = await getAnnouncementWithTranslations(announcement.id);

    if (result.translation) {
      setEditingTranslation(result.translation);
    } else {
      setEditingTranslation(null);
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingAnnouncement(null);
    setEditingTranslation(null);
    setEditDialogId(null);
    window.location.reload();
  };

  const getPriorityBadgeVariant = (
    priority: string
  ): "default" | "destructive" | "secondary" => {
    switch (priority) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  const hasPrevious = currentPage > 1;

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("announcementCreateNew")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <AnnouncementForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("announcementTitle")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("announcementLocaleLabel")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("announcementPriority")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("announcementPublished")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("announcementDateRange")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {announcements.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500" colSpan={6}>
                  {t("announcementNoData")}
                </td>
              </tr>
            ) : (
              announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td className="px-6 py-4 text-gray-900 text-sm">
                    {announcement.title}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant="outline">
                      {announcement.locale === "ja"
                        ? t("announcementLocaleJa")
                        : t("announcementLocaleEn")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      variant={getPriorityBadgeVariant(announcement.priority)}
                    >
                      {t(
                        `announcementPriority${announcement.priority.charAt(0).toUpperCase()}${announcement.priority.slice(1)}`
                      )}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Badge
                      variant={announcement.published ? "default" : "secondary"}
                    >
                      {announcement.published
                        ? t("announcementPublishedYes")
                        : t("announcementPublishedNo")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {announcement.starts_at && (
                      <div>{formatDate(announcement.starts_at, locale)}</div>
                    )}
                    {announcement.ends_at && (
                      <div>~ {formatDate(announcement.ends_at, locale)}</div>
                    )}
                    {!(announcement.starts_at || announcement.ends_at) && (
                      <div>{t("announcementNoDateRange")}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <Dialog
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditDialogId(null);
                            setEditingAnnouncement(null);
                            setEditingTranslation(null);
                          }
                        }}
                        open={editDialogId === announcement.id}
                      >
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => handleEdit(announcement)}
                            size="sm"
                            variant="outline"
                          >
                            {t("editAction")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                          {editDialogId === announcement.id &&
                            editingAnnouncement?.id === announcement.id && (
                              <AnnouncementForm
                                announcement={editingAnnouncement}
                                onSuccess={handleFormSuccess}
                                translation={editingTranslation || undefined}
                              />
                            )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        disabled={deleting === announcement.id}
                        onClick={() => handleDelete(announcement.id)}
                        size="sm"
                        variant="destructive"
                      >
                        {deleting === announcement.id
                          ? t("deleteInProgress")
                          : t("deleteAction")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(hasPrevious || hasMore) && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              {hasPrevious && (
                <PaginationItem>
                  <PaginationPrevious
                    href={`${pathname}?page=${currentPage - 1}`}
                  />
                </PaginationItem>
              )}
              <PaginationItem>
                <span className="px-4 text-sm">
                  {t("currentPage", { current: currentPage })}
                </span>
              </PaginationItem>
              {hasMore && (
                <PaginationItem>
                  <PaginationNext
                    href={`${pathname}?page=${currentPage + 1}`}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
