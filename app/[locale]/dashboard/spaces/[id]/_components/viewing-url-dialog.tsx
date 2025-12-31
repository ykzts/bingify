"use client";

import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [open, setOpen] = useState(false);

  // URL builder options
  const [hideInfo, setHideInfo] = useState(false);
  const [transparent, setTransparent] = useState(false);

  // Build URL with query parameters
  const buildUrl = () => {
    const baseUrl = `${window.location.origin}/${locale}/screen/${currentToken}`;
    const params = new URLSearchParams();

    if (hideInfo) {
      params.append("hideInfo", "true");
    }
    if (transparent) {
      params.append("transparent", "true");
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const viewingUrl = buildUrl();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(viewingUrl);
      setMessage({ text: t("copyUrlSuccess"), type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
      setMessage({ text: t("copyUrlError"), type: "error" });
      setTimeout(() => setMessage(null), 3000);
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
    setMessage(null);

    try {
      const result = await regenerateViewToken(spaceId);

      if (result.success && result.viewToken) {
        setCurrentToken(result.viewToken);
        setMessage({ text: t("regenerateSuccess"), type: "success" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          text: result.error || t("regenerateError"),
          type: "error",
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
      setMessage({ text: t("regenerateError"), type: "error" });
      setTimeout(() => setMessage(null), 5000);
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
                {message?.type === "success" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
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
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={hideInfo}
                  id="hide-info"
                  onCheckedChange={(checked) =>
                    setHideInfo(checked === true)
                  }
                />
                <Label className="cursor-pointer text-sm" htmlFor="hide-info">
                  {t("urlOptionHideInfo")}
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={transparent}
                  id="transparent"
                  onCheckedChange={(checked) =>
                    setTransparent(checked === true)
                  }
                />
                <Label
                  className="cursor-pointer text-sm"
                  htmlFor="transparent"
                >
                  {t("urlOptionTransparent")}
                </Label>
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

          {/* Messages */}
          {message && (
            <div
              className={`rounded-lg border p-3 ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
