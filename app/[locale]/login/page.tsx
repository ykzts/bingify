import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { getEnabledAuthProviders } from "@/lib/data/auth-providers";
import { getSystemSettings } from "@/lib/data/system-settings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/server";
import { validateRedirectPath } from "@/lib/utils/url";
import { LoginForm } from "./_components/login-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });

  return {
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      title: t("metaTitle"),
    },
    title: t("metaTitle"),
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 via-amber-50 to-sky-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
