import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSystemSettings } from "@/lib/data/system-settings";
import { getAuthProviders } from "./_actions/auth-providers";
import { IntegratedAuthProvidersForm } from "./_components/integrated-auth-providers-form";

export const dynamic = "force-dynamic";

export default async function AdminAuthProvidersPage({
  params,
}: PageProps<"/[locale]/admin/auth-providers">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminAuthProviders");

  const { providers, error: providersError } = await getAuthProviders();
  const {
    settings,
    error: settingsError,
    warnings,
  } = await getSystemSettings();

  if (providersError) {
    let errorMessage: string;
    switch (providersError) {
      case "errorFetchFailed":
        errorMessage = t("errorFetchFailed");
        break;
      case "errorGeneric":
        errorMessage = t("errorGeneric");
        break;
      default:
        errorMessage = t("errorGeneric");
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (settingsError) {
    let errorMessage: string;
    switch (settingsError) {
      case "errorFetchFailed":
        errorMessage = t("errorFetchFailed");
        break;
      case "errorNoData":
        errorMessage = t("errorNoData");
        break;
      case "errorInvalidData":
        errorMessage = t("errorInvalidData");
        break;
      case "errorGeneric":
        errorMessage = t("errorGeneric");
        break;
      default:
        errorMessage = t("errorGeneric");
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800">
            {t("warningInvalidFields")}
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            {t("warningInvalidFieldsDescription", {
              fields: warnings.join(", "),
            })}
          </p>
        </div>
      )}

      <IntegratedAuthProvidersForm
        initialSettings={settings}
        providers={providers || []}
      />
    </div>
  );
}
