import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { getEnabledAuthProviders } from "@/lib/data/auth-providers";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 via-amber-50 to-sky-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        }
      >
        <LoginForm providers={providers} />
      </Suspense>
    </div>
  );
}
