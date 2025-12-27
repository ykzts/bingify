"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { regenerateViewToken } from "../../../actions";

interface Props {
  locale: string;
  spaceId: string;
  viewToken: string;
}

export function ObsUrlManager({ locale, spaceId, viewToken }: Props) {
  const t = useTranslations("AdminSpace");
  const [currentToken, setCurrentToken] = useState(viewToken);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const obsUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/screen/${currentToken}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(obsUrl);
      setMessage({ text: t("copyUrlSuccess"), type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
      setMessage({ text: "Failed to copy URL", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRegenerateUrl = async () => {
    // biome-ignore lint/suspicious/noAlert: User confirmation required for destructive action
    if (!confirm(t("regenerateConfirm"))) {
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
        <label className="mb-2 block font-medium text-sm" htmlFor="obs-url">
          {t("obsUrlLabel")}
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm"
            id="obs-url"
            readOnly
            value={obsUrl}
          />
          <button
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
            onClick={handleCopyUrl}
            type="button"
          >
            <Copy className="h-4 w-4" />
            {t("copyUrlButton")}
          </button>
        </div>
      </div>

      <button
        className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-600 text-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isRegenerating}
        onClick={handleRegenerateUrl}
        type="button"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
        />
        {t("regenerateUrlButton")}
      </button>

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
