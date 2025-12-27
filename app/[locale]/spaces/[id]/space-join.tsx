"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { joinSpace } from "../actions";

interface SpaceJoinProps {
  locale: string;
  spaceId: string;
}

export function SpaceJoin({ locale, spaceId }: SpaceJoinProps) {
  const t = useTranslations("SpaceJoin");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const result = await joinSpace(spaceId);

      if (result.success) {
        // Refresh the page to show the space content
        router.refresh();
      } else {
        setError(result.error || t("joinError"));
        setIsJoining(false);
      }
    } catch (err) {
      console.error("Error joining space:", err);
      setError(t("joinError"));
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${locale}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 via-amber-50 to-sky-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-2xl">{t("title")}</h1>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-center text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isJoining}
            onClick={handleJoin}
            type="button"
          >
            {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
            {isJoining ? t("joining") : t("joinButton")}
          </button>

          <button
            className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isJoining}
            onClick={handleCancel}
            type="button"
          >
            {t("cancelButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
