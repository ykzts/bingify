"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAbsoluteUrl } from "@/lib/utils/url";

interface Props {
  shareKey: string;
}

export function SpaceUrlShare({ shareKey }: Props) {
  const t = useTranslations("AdminSpace");
  const spaceUrl = getAbsoluteUrl(`/@${shareKey}`);

  const handleCopyUrl = async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        toast.error(t("spaceUrlCopyError"));
        return;
      }
      await navigator.clipboard.writeText(spaceUrl);
      toast.success(t("spaceUrlCopySuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("spaceUrlCopyError"));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">{t("spaceUrlSection")}</h2>
        <p className="text-gray-600 text-sm" id="space-url-description">
          {t("spaceUrlDescription")}
        </p>
        <div className="space-y-2">
          <Label htmlFor="space-url">{t("spaceUrlLabel")}</Label>
          <div className="flex gap-2">
            <Input
              aria-describedby="space-url-description"
              aria-label={t("spaceUrlLabel")}
              id="space-url"
              readOnly
              type="text"
              value={spaceUrl}
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
    </div>
  );
}
