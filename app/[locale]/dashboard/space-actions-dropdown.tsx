"use client";

import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPathname, useRouter } from "@/i18n/navigation";
import type { UserSpace } from "./actions";
import { deleteSpace } from "./actions";

interface SpaceActionsDropdownProps {
  locale: string;
  space: UserSpace;
}

export function SpaceActionsDropdown({
  locale,
  space,
}: SpaceActionsDropdownProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleManage = () => {
    router.push(`/${locale}/dashboard/spaces/${space.id}`);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${getPathname({ href: `/@${space.share_key}`, locale })}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copyLinkSuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("copyLinkError"));
    }
  };

  const handleOpenPublicView = () => {
    const url = getPathname({ href: `/@${space.share_key}`, locale });
    window.open(url, "_blank");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSpace(space.id);
      if (result.success) {
        toast.success(t("deleteSuccess"));
        router.refresh();
        setShowDeleteDialog(false);
      } else {
        toast.error(result.error || t("deleteError"));
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReopen = () => {
    // Navigate to the space settings page where user can change status from closed to draft/active
    router.push(`/${locale}/dashboard/spaces/${space.id}`);
  };

  const isActive = space.status === "active";
  const isDraft = space.status === "draft";
  const isClosed = space.status === "closed";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t("spaceActions")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleManage}>
            <Settings className="mr-2 h-4 w-4" />
            {t("manageAction")}
          </DropdownMenuItem>

          {(isActive || isDraft) && (
            <>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                {t("copyLinkAction")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenPublicView}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("openPublicViewAction")}
              </DropdownMenuItem>
            </>
          )}

          {isClosed && (
            <DropdownMenuItem onClick={handleReopen}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("reopenAction")}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deleteAction")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? t("deleteInProgress") : t("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
