"use client";

import { useTranslations } from "next-intl";
import { CloseSpaceButton } from "./close-space-button";
import { ResetGameButton } from "./reset-game-button";

interface DangerZoneProps {
  onResetSuccess?: () => void;
  spaceId: string;
}

export function DangerZone({ onResetSuccess, spaceId }: DangerZoneProps) {
  const t = useTranslations("AdminSpace");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 font-semibold text-lg text-red-600">
          {t("dangerZoneTitle")}
        </h3>
        <p className="text-gray-600 text-sm">{t("dangerZoneDescription")}</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h4 className="mb-1 font-medium text-sm">{t("resetGameButton")}</h4>
          <p className="mb-3 text-gray-700 text-xs">
            {t("resetGameDescription")}
          </p>
          <ResetGameButton onSuccess={onResetSuccess} spaceId={spaceId} />
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h4 className="mb-1 font-medium text-sm">{t("closeSpaceButton")}</h4>
          <p className="mb-3 text-gray-700 text-xs">
            {t("closeSpaceDescription")}
          </p>
          <CloseSpaceButton spaceId={spaceId} />
        </div>
      </div>
    </div>
  );
}
