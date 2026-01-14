"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SpaceAnnouncementForm } from "@/app/[locale]/spaces/[id]/_components/space-announcement-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface SpaceAnnouncementButtonProps {
  spaceId: string;
}

/**
 * スペースお知らせ作成ボタン（ダッシュボード用）
 * お知らせの作成機能を提供
 */
export function SpaceAnnouncementButton({
  spaceId,
}: SpaceAnnouncementButtonProps) {
  const t = useTranslations("SpaceAnnouncement");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  return (
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
  );
}
