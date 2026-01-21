"use client";

import { AlertCircle, Loader2, RotateCcw, Trash2, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  getProviderLabel,
  ProviderIcon,
} from "@/components/providers/provider-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/supabase";
import {
  deleteCustomAvatar,
  resetAvatarToDefault,
} from "../_actions/avatar-admin";

interface AvatarManagementProps {
  userId: string;
  userProfile: Tables<"profiles">;
}

function AvatarProviderIcon({ source }: { source: string | null }) {
  if (source === "google") {
    return <ProviderIcon provider="google" />;
  }
  if (source === "twitch") {
    return <ProviderIcon provider="twitch" />;
  }
  return <User aria-hidden="true" className="size-5" />;
}

export function AvatarManagement({
  userId,
  userProfile,
}: AvatarManagementProps) {
  const t = useTranslations("Admin");
  const confirm = useConfirm();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteCustomAvatar = async () => {
    if (
      !(await confirm({
        description: t("avatarDeleteConfirm"),
        title: t("avatarDeleteTitle"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const result = await deleteCustomAvatar(userId);

    if (result.success) {
      toast.success(t("avatarDeleteSuccess"));
      router.refresh();
    } else {
      const errorMessage = result.error
        ? t(result.error as "errorGeneric")
        : t("errorGeneric");
      setError(errorMessage);
    }

    setIsDeleting(false);
  };

  const handleResetToDefault = async () => {
    if (
      !(await confirm({
        description: t("avatarResetConfirm"),
        title: t("avatarResetTitle"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setError(null);
    setIsResetting(true);

    const result = await resetAvatarToDefault(userId);

    if (result.success) {
      toast.success(t("avatarResetSuccess"));
      router.refresh();
    } else {
      const errorMessage = result.error
        ? t(result.error as "errorGeneric")
        : t("errorGeneric");
      setError(errorMessage);
    }

    setIsResetting(false);
  };

  const getAvatarSourceLabel = (source: string | null) => {
    switch (source) {
      case "google":
      case "twitch":
        return getProviderLabel(source);
      case "upload":
        return t("avatarSourceUpload");
      default:
        return t("avatarSourceDefault");
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 font-semibold text-lg">{t("avatarManagement")}</h3>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* 現在のアバター */}
        <div>
          <h4 className="mb-3 font-medium text-sm">{t("currentAvatar")}</h4>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {userProfile.avatar_url ? (
                <AvatarImage asChild src={userProfile.avatar_url}>
                  <Image
                    alt={userProfile.full_name || userProfile.email || "User"}
                    className="object-cover"
                    fill
                    sizes="64px"
                    src={userProfile.avatar_url}
                  />
                </AvatarImage>
              ) : null}
              <AvatarFallback>
                <AvatarProviderIcon source={userProfile.avatar_source} />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {getAvatarSourceLabel(userProfile.avatar_source)}
              </p>
              {userProfile.avatar_source !== "default" &&
                userProfile.avatar_url && (
                  <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                    {userProfile.avatar_url}
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* アクション */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t("avatarActions")}</h4>

          {/* カスタムアップロード画像の削除 */}
          {userProfile.avatar_source === "upload" && (
            <div className="flex items-start gap-3 rounded-lg border p-4 dark:border-gray-700">
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {t("avatarDeleteUploadTitle")}
                </p>
                <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                  {t("avatarDeleteUploadDescription")}
                </p>
              </div>
              <Button
                disabled={isDeleting}
                onClick={handleDeleteCustomAvatar}
                size="sm"
                type="button"
                variant="destructive"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("avatarDeleteButton")}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* デフォルトに戻す */}
          {userProfile.avatar_source !== "default" && (
            <div className="flex items-start gap-3 rounded-lg border p-4 dark:border-gray-700">
              <div className="flex-1">
                <p className="font-medium text-sm">{t("avatarResetTitle")}</p>
                <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                  {t("avatarResetDescription")}
                </p>
              </div>
              <Button
                disabled={isResetting}
                onClick={handleResetToDefault}
                size="sm"
                type="button"
                variant="outline"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("avatarResetButton")}
                  </>
                )}
              </Button>
            </div>
          )}

          {userProfile.avatar_source === "default" && (
            <p className="text-gray-500 text-sm dark:text-gray-400">
              {t("avatarIsDefault")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
