import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { hasAdminUser } from "@/app/[locale]/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { ClaimAdminButton } from "./_components/claim-admin-button";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if an admin already exists
  const adminExists = await hasAdminUser();
  if (adminExists) {
    redirect(`/${locale}/admin`);
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/setup`);
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-6">
      <SetupContent />
    </div>
  );
}

function SetupContent() {
  const t = useTranslations("Setup");

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="mb-2 font-bold text-3xl">{t("title")}</h1>
        <p className="text-gray-600">{t("subtitle")}</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm">{t("welcomeMessage")}</p>
        </div>

        <div className="space-y-2 text-gray-700 text-sm">
          <p>{t("description1")}</p>
          <p>{t("description2")}</p>
        </div>
      </div>

      <ClaimAdminButton />

      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="font-semibold text-sm text-yellow-800">
          {t("warningTitle")}
        </p>
        <p className="mt-1 text-sm text-yellow-700">{t("warningMessage")}</p>
      </div>
    </div>
  );
}
