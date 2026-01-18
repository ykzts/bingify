import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSendEmailHookSecret } from "./_actions/send-email-hook-secret";
import { SendEmailHookSecretManagement } from "./_components/send-email-hook-secret-management";

export const dynamic = "force-dynamic";

export default async function AdminAuthHooksPage({
  params,
}: PageProps<"/[locale]/admin/auth-hooks">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminAuthHooks");

  const { secret, updatedAt, error } = await getSendEmailHookSecret();

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

      <SendEmailHookSecretManagement
        initialSecret={secret}
        updatedAt={updatedAt}
      />
    </div>
  );
}
