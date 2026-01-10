"use client";

import { Copy, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SystemFeatures } from "@/lib/types/settings";
import type { Space } from "@/lib/types/space";
import { getAbsoluteUrl } from "@/lib/utils/url";
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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Open settings sheet if ?open=settings query parameter is present
  useEffect(() => {
    if (searchParams.get("open") === "settings") {
      setOpen(true);
    }
  }, [searchParams]);

  const handleSuccess = (message: string) => {
    setOpen(false);
    toast.success(message);
  };

  const handleCopyUrl = async () => {
    const url = getAbsoluteUrl(`/@${space.share_key}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("spaceUrlCopySuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("spaceUrlCopyError"));
    }
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
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
          {/* Space URL Section */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">{t("spaceUrlSection")}</h2>
            <p className="text-gray-600 text-sm">{t("spaceUrlDescription")}</p>
            <div className="space-y-2">
              <Label htmlFor="space-url">{t("spaceUrlLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="space-url"
                  readOnly
                  type="text"
                  value={getAbsoluteUrl(`/@${space.share_key}`)}
                />
                <Button
                  onClick={handleCopyUrl}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">{t("spaceUrlCopyButton")}</span>
                </Button>
              </div>
            </div>
          </div>

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
              onResetSuccess={() => setOpen(false)}
              spaceId={space.id}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
