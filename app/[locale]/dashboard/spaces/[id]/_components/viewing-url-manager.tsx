"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { regenerateViewToken } from "../../../actions";

interface Props {
  locale: string;
  spaceId: string;
  viewToken: string;
}

export function ViewingUrlManager({ locale, spaceId, viewToken }: Props) {
  const t = useTranslations("AdminSpace");
  const confirm = useConfirm();
  const [currentToken, setCurrentToken] = useState(viewToken);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const viewingUrl = `${window.location.origin}/${locale}/screen/${currentToken}`;

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

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block font-medium text-sm" htmlFor="viewing-url">
          {t("viewingUrlLabel")}
        </label>
        <p className="mb-2 text-gray-600 text-sm">
          {t("viewingUrlDescription")}
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm"
            id="viewing-url"
            readOnly
            value={viewingUrl}
          />
          <Button onClick={handleCopyUrl} type="button">
            <Copy className="h-4 w-4" />
            {t("copyUrlButton")}
          </Button>
        </div>
      </div>

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
  );
}
