"use client";

import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { regenerateViewToken } from "../../../actions";

interface Props {
  locale: string;
  spaceId: string;
  viewToken: string;
}

export function ViewingUrlDialog({ locale, spaceId, viewToken }: Props) {
  const t = useTranslations("AdminSpace");
  const confirm = useConfirm();
  const [currentToken, setCurrentToken] = useState(viewToken);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [open, setOpen] = useState(false);

  // URL builder options (actual screen page parameters)
  const [mode, setMode] = useState<"full" | "minimal">("full");
  const [bg, setBg] = useState<"default" | "transparent" | "green" | "blue">(
    "default"
  );

  // Build URL with query parameters
  const buildUrl = () => {
    const baseUrl = getAbsoluteUrl(`/${locale}/screen/${currentToken}`);
    const params = new URLSearchParams();

    if (mode !== "full") {
      params.append("mode", mode);
    }
    if (bg !== "default") {
      params.append("bg", bg);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const viewingUrl = buildUrl();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(viewingUrl);
      toast.success(t("copyUrlSuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("copyUrlError"));
    }
  };

  const handleRegenerateUrl = async () => {
    if (
      !(await confirm({
        description: t("regenerateConfirm"),
        title: t("regenerateUrlButton"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsRegenerating(true);

    try {
      const result = await regenerateViewToken(spaceId);

      if (result.success && result.viewToken) {
        setCurrentToken(result.viewToken);
        toast.success(t("regenerateSuccess"));
      } else {
        toast.error(result.error || t("regenerateError"));
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
      toast.error(t("regenerateError"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenUrl = () => {
    window.open(viewingUrl, "_blank");
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ExternalLink className="h-4 w-4" />
          {t("viewingUrlButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("viewingUrlDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("viewingUrlDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Display and Copy */}
          <div className="space-y-3">
            <Label htmlFor="viewing-url">{t("viewingUrlLabel")}</Label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm"
                id="viewing-url"
                readOnly
                value={viewingUrl}
              />
              <Button onClick={handleCopyUrl} size="icon" type="button">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleOpenUrl}
                size="icon"
                type="button"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">
              {t("urlBuilderOptionsTitle")}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mode-select">{t("urlOptionMode")}</Label>
                <Select
                  onValueChange={(value) =>
                    setMode(value as "full" | "minimal")
                  }
                  value={mode}
                >
                  <SelectTrigger id="mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{t("urlModeFull")}</SelectItem>
                    <SelectItem value="minimal">
                      {t("urlModeMinimal")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bg-select">{t("urlOptionBackground")}</Label>
                <Select
                  onValueChange={(value) =>
                    setBg(value as "default" | "transparent" | "green" | "blue")
                  }
                  value={bg}
                >
                  <SelectTrigger id="bg-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t("urlBgDefault")}</SelectItem>
                    <SelectItem value="transparent">
                      {t("urlBgTransparent")}
                    </SelectItem>
                    <SelectItem value="green">{t("urlBgGreen")}</SelectItem>
                    <SelectItem value="blue">{t("urlBgBlue")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("urlBuilderHelpText")}
            </p>
          </div>

          {/* Regenerate URL */}
          <div className="border-t pt-4">
            <Button
              disabled={isRegenerating}
              onClick={handleRegenerateUrl}
              type="button"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
              />
              {t("regenerateUrlButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
