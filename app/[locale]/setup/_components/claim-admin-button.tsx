"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { claimAdmin } from "../../admin/_actions/admin-operations";

// Helper to convert error code to translation key
// e.g., "errorGeneric" -> "errorsGeneric"
const ERROR_PREFIX_REGEX = /^error/;
function getErrorKey(errorCode: string): string {
  const withoutPrefix = errorCode.replace(ERROR_PREFIX_REGEX, "");
  return `errors${withoutPrefix.charAt(0).toUpperCase()}${withoutPrefix.slice(1)}`;
}

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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <p className="text-red-800 text-sm dark:text-red-200">
            {t(getErrorKey(state.error))}
          </p>
        </div>
      )}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? t("claimingButton") : t("claimButton")}
      </Button>
    </form>
  );
}
