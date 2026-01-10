"use client";

import { Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SystemFeatures } from "@/lib/types/settings";
import type { Space } from "@/lib/types/space";
import { AdminManagement } from "./admin-management";
import { DangerZone } from "./danger-zone";
import { SpaceSettingsForm } from "./space-settings-form";

interface Props {
  currentParticipantCount: number;
  features: SystemFeatures;
  hasGoogleAuth: boolean;
  hasTwitchAuth: boolean;
  isOwner: boolean;
  locale: string;
  space: Space;
  systemMaxParticipants: number;
}

export function SpaceSettingsSheet({
  currentParticipantCount,
  features,
  hasGoogleAuth,
  hasTwitchAuth,
  isOwner,
  locale,
  space,
  systemMaxParticipants,
}: Props) {
  const t = useTranslations("AdminSpace");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // URLパラメータを更新する処理（useEffectEventで依存配列から分離）
  const updateUrl = useEffectEvent((shouldOpen: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (shouldOpen) {
      params.set("open", "settings");
    } else {
      params.delete("open");
    }

    // 同じパスに更新されたクエリパラメータで遷移（履歴を汚さない）
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl);
  });

  // URLパラメータとシート状態を同期（外部ナビゲーション対応）
  useEffect(() => {
    const shouldOpen = searchParams.get("open") === "settings";
    // URLパラメータと状態が異なる場合のみ更新
    // ブラウザの戻る/進むや直接URLアクセスに対応
    if (shouldOpen !== open) {
      setOpen(shouldOpen);
    }
  }, [searchParams, open]);

  // シートの開閉とURLパラメータ管理を行うハンドラ
  const handleOpenChange = (newOpen: boolean) => {
    // 状態が実際に変わる場合のみ更新
    if (newOpen === open) {
      return;
    }

    setOpen(newOpen);
    updateUrl(newOpen);
  };

  const handleSuccess = (message: string) => {
    handleOpenChange(false);
    toast.success(message);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings className="h-4 w-4" />
          {t("settingsButton")}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t("settingsTitle")}</SheetTitle>
          <SheetDescription>
            {space.share_key} -{" "}
            {space.status === "draft"
              ? t("settingsStatusDraft")
              : t("settingsStatusActive")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-8 px-6">
          {/* Space Settings Form */}
          <SpaceSettingsForm
            currentParticipantCount={currentParticipantCount}
            features={features}
            hasGoogleAuth={hasGoogleAuth}
            hasTwitchAuth={hasTwitchAuth}
            isOwner={isOwner}
            locale={locale}
            onSuccess={handleSuccess}
            space={space}
            systemMaxParticipants={systemMaxParticipants}
          />

          {/* Admin Management - Only visible to owner */}
          {isOwner && (
            <div className="border-t pt-8">
              <AdminManagement spaceId={space.id} />
            </div>
          )}

          {/* Danger Zone - Always visible for destructive actions */}
          <div className="border-red-200 border-t pt-8">
            <DangerZone
              onResetSuccess={() => handleOpenChange(false)}
              spaceId={space.id}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
