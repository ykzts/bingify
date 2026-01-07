"use client";

import { Loader2, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { PublishSpaceState } from "../_actions/settings";
import { publishSpace } from "../_actions/settings";

interface Props {
  locale: string;
  spaceId: string;
}

export function DraftStatusView({ locale, spaceId }: Props) {
  const t = useTranslations("AdminSpace");
  const router = useRouter();

  const [publishState, publishAction, isPublishing] = useActionState<
    PublishSpaceState,
    FormData
  >(publishSpace.bind(null, spaceId), {
    success: false,
  });

  useEffect(() => {
    if (publishState.success) {
      router.push(`/${locale}/dashboard/spaces/${spaceId}`);
      router.refresh();
    }
  }, [publishState.success, router, spaceId, locale]);

  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-purple-100 p-4">
            <Rocket className="h-12 w-12 text-purple-600" />
          </div>
        </div>
        <h2 className="mb-3 font-bold text-2xl">{t("draftMainTitle")}</h2>
        <p className="mb-6 text-gray-600">{t("draftMainMessage")}</p>

        <form action={publishAction}>
          <Button disabled={isPublishing} size="lg" type="submit">
            {isPublishing && <Loader2 className="h-5 w-5 animate-spin" />}
            {!isPublishing && <Rocket className="h-5 w-5" />}
            {t("publishSpaceButton")}
          </Button>
        </form>

        {publishState.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-red-800 text-sm">{publishState.error}</p>
          </div>
        )}

        <p className="mt-6 text-gray-500 text-sm">{t("draftMainHint")}</p>
      </div>
    </div>
  );
}
