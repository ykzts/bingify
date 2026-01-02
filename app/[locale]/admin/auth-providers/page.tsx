import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthProvidersManagement } from "./_components/auth-providers-management";
import { getAuthProviders } from "./_lib/actions";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminAuthProvidersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminAuthProviders");

  const { providers, error } = await getAuthProviders();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t(error, { default: t("errorGeneric") })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-lg">{t("managementTitle")}</h3>
        <AuthProvidersManagement providers={providers || []} />
      </div>
    </div>
  );
}
