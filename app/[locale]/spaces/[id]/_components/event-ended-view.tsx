"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function EventEndedView() {
  const t = useTranslations("UserSpace");

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-100 p-6">
            <CheckCircle className="h-16 w-16 text-gray-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-bold text-3xl text-gray-900">
            {t("eventEndedTitle")}
          </h2>
          <p className="text-gray-600 text-lg">{t("eventEndedMessage")}</p>
        </div>
      </div>
    </div>
  );
}
