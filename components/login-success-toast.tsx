"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Displays a success toast notification when user successfully logs in.
 * Reads the 'login_success' query parameter, shows the toast once, and cleans up the URL.
 */
export function LoginSuccessToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Login");
  const hasShownToast = useRef(false);

  // Get message once to avoid including `t` in dependencies
  const loginSuccessMessage = t("loginSuccess");

  useEffect(() => {
    const loginSuccess = searchParams.get("login_success");

    // Show toast only once when login_success parameter is present
    if (loginSuccess === "true" && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.success(loginSuccessMessage);

      // Clean up URL by removing the login_success parameter
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("login_success");

      const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;

      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router, loginSuccessMessage]);

  return null;
}
