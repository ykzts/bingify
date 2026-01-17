import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getEnabledAuthProviders } from "@/lib/supabase/auth/providers";
import { getSystemSettings } from "@/lib/supabase/server/system";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/constants/system";
import { validateRedirectPath } from "@/lib/utils/url";
import { LoginForm } from "./_components/login-form";

export const runtime = "edge";

interface LoginPageProps {
  params: { locale: string };
  searchParams: Promise<Record<string, string>>;
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = params;

  // 既にセッションがある場合はリダイレクト
  // edge runtime では cookies から直接読み取れないためサーバー側で判定
  // cf. https://nextjs.org/docs/app/api-reference/functions/redirect#edge-runtime
  if (process.env.__AUTH_REDIRECT__) {
    const query = await searchParams;
    const redirectParam = query?.redirect;
    const redirectPath =
      typeof redirectParam === "string"
        ? validateRedirectPath(redirectParam, `/${locale}`)
        : `/${locale}`;
    redirect(redirectPath);
  }

  setRequestLocale(locale);

  const providers = await getEnabledAuthProviders();
  const systemSettingsResult = await getSystemSettings();
  const systemSettings =
    systemSettingsResult.settings || DEFAULT_SYSTEM_SETTINGS;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-red-100 via-amber-50 to-sky-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600 dark:border-t-transparent" />
          </div>
        }
      >
        <LoginForm providers={providers} systemSettings={systemSettings} />
      </Suspense>
    </div>
  );
}
