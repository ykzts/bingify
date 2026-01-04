import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { getEnabledAuthProviders } from "@/lib/data/auth-providers";
import { createClient } from "@/lib/supabase/server";
import { validateRedirectPath } from "@/lib/utils/url";
import { LoginForm } from "./_components/login-form";

export const dynamic = "force-dynamic";

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

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

async function LoginPageContent({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: Promise<{ redirect?: string | string[] } | undefined>;
}) {
  const user = await getCurrentUser();

  if (user) {
    const query = await searchParams;
    const redirectParam = query?.redirect;
    const redirectPath =
      typeof redirectParam === "string"
        ? validateRedirectPath(redirectParam, `/${locale}`)
        : `/${locale}`;
    redirect(redirectPath);
  }

  const providers = await getEnabledAuthProviders();

  return <LoginForm providers={providers} />;
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login">) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 via-amber-50 to-sky-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          </div>
        }
      >
        <LoginPageContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
