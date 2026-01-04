"use client";

import {
  Copy,
  DoorClosed,
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
import { useRouter } from "@/i18n/navigation";
import { getAbsoluteUrl } from "@/lib/utils/url";
import type { UserSpace } from "../_lib/actions";
import { deleteSpace } from "../_lib/actions";
import { closeSpace } from "../spaces/[id]/_lib/actions";

interface SpaceActionsDropdownProps {
  space: UserSpace;
}

export function SpaceActionsDropdown({ space }: SpaceActionsDropdownProps) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const handleManage = () => {
    router.push(`/dashboard/spaces/${space.id}?open=settings`);
  };

  const handleCopyLink = async () => {
    const url = getAbsoluteUrl(`/@${space.share_key}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copyLinkSuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("copyLinkError"));
    }
  };

  const handleOpenPublicView = () => {
    const url = `/@${space.share_key}`;
    window.open(url, "_blank");
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      const result = await closeSpace(space.id);
      if (result.success) {
        toast.success(t("closeSuccess"));
        router.refresh();
        setShowCloseDialog(false);
      } else {
        toast.error(result.error || t("closeError"));
      }
    } catch (error) {
      console.error("Close error:", error);
      toast.error(t("closeError"));
    } finally {
      setIsClosing(false);
    }
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
    router.push(`/dashboard/spaces/${space.id}`);
  };

  const isActive = space.status === "active";
  const isDraft = space.status === "draft";
  const isClosed = space.status === "closed";
  const isOwner = space.is_owner !== false; // Default to true if undefined for backward compatibility

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

          {/* Show close action for non-closed spaces */}
          {!isClosed && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setShowCloseDialog(true)}
            >
              <DoorClosed className="mr-2 h-4 w-4" />
              {t("closeAction")}
            </DropdownMenuItem>
          )}

          {/* Only show delete action for owners */}
          {isOwner && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteAction")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Close Space Dialog */}
      <AlertDialog onOpenChange={setShowCloseDialog} open={showCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("closeAction")}</AlertDialogTitle>
            <AlertDialogDescription>{t("closeConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isClosing}
              onClick={handleClose}
            >
              {isClosing ? t("closeInProgress") : t("closeAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Space Dialog */}
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
