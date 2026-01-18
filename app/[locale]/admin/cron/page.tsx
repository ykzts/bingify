import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCronSecret } from "./_actions/cron-secret";
import { CronSecretManagement } from "./_components/cron-secret-management";

export const dynamic = "force-dynamic";

export default async function AdminCronPage({
  params,
}: PageProps<"/[locale]/admin/cron">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminCron");

  const { hasSecret, updatedAt, error } = await getCronSecret();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <CronSecretManagement
        hasSecret={hasSecret}
        updatedAt={updatedAt}
      />
    </div>
  );
}
