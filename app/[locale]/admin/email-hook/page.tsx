import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getEmailHookSecret } from "./_actions/email-hook-secret";
import { EmailHookSecretManagement } from "./_components/email-hook-secret-management";

export const dynamic = "force-dynamic";

export default async function AdminEmailHookPage({
  params,
}: PageProps<"/[locale]/admin/email-hook">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminEmailHook");

  const { secret, updatedAt, error } = await getEmailHookSecret();

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

      <EmailHookSecretManagement
        initialSecret={secret}
        updatedAt={updatedAt}
      />
    </div>
  );
}
