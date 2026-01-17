"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Displays a success toast notification when user successfully logs in.
 * Reads the 'login_success' query parameter and shows the toast once.
 */
export function LoginSuccessToast() {
  const searchParams = useSearchParams();
  const t = useTranslations("Login");
  const hasShownToast = useRef(false);

  useEffect(() => {
    const loginSuccess = searchParams.get("login_success");

    // Show toast only once when login_success parameter is present
    if (loginSuccess === "true" && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.success(t("loginSuccess"));
    }
  }, [searchParams, t]);

  return null;
}
