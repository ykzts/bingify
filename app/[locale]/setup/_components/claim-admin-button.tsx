"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { claimAdmin } from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function ClaimAdminButton() {
  const t = useTranslations("Setup");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(claimAdmin, {
    success: false,
  });

  // Redirect to admin dashboard on success
  useEffect(() => {
    if (state.success) {
      router.push("/admin");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      {state.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-red-800 text-sm">
            {t(`errors.${state.error}`, { default: t("errors.errorGeneric") })}
          </p>
        </div>
      )}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? t("claimingButton") : t("claimButton")}
      </Button>
    </form>
  );
}
