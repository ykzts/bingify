import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSendEmailHookSecret } from "../auth-hooks/_actions/send-email-hook-secret";
import { SendEmailHookSecretManagement } from "../auth-hooks/_components/send-email-hook-secret-management";
import { getCronSecret } from "../cron/_actions/cron-secret";
import { CronSecretManagement } from "../cron/_components/cron-secret-management";

export const dynamic = "force-dynamic";

export default async function AdminSecretsPage({
  params,
}: PageProps<"/[locale]/admin/secrets">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSecrets");
  const tAuthHooks = await getTranslations("AdminAuthHooks");
  const tCron = await getTranslations("AdminCron");

  // Fetch both secrets data
  const authHookData = await getSendEmailHookSecret();
  const cronData = await getCronSecret();

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <div className="space-y-8">
        {/* Auth Hooks Section */}
        <section>
          <div className="mb-4">
            <h3 className="font-bold text-xl">{t("authHooksTitle")}</h3>
            <p className="mt-1 text-gray-600 text-sm">
              {tAuthHooks("description")}
            </p>
          </div>

          {authHookData.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authHookData.error}</AlertDescription>
            </Alert>
          ) : (
            <SendEmailHookSecretManagement
              hasSecret={authHookData.hasSecret}
              updatedAt={authHookData.updatedAt}
            />
          )}
        </section>

        {/* Cron Jobs Section */}
        <section>
          <div className="mb-4">
            <h3 className="font-bold text-xl">{t("cronTitle")}</h3>
            <p className="mt-1 text-gray-600 text-sm">{tCron("description")}</p>
          </div>

          {cronData.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cronData.error}</AlertDescription>
            </Alert>
          ) : (
            <CronSecretManagement
              hasSecret={cronData.hasSecret}
              updatedAt={cronData.updatedAt}
            />
          )}
        </section>
      </div>
    </div>
  );
}
