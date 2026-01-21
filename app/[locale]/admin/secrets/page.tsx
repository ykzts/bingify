import { AlertCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCronSecret } from "./_actions/cron-secret";
import { getSendEmailHookSecret } from "./_actions/send-email-hook-secret";
import { CronSecretManagement } from "./_components/cron-secret-management";
import { SendEmailHookSecretManagement } from "./_components/send-email-hook-secret-management";

export const dynamic = "force-dynamic";

export default async function AdminSecretsPage({
  params,
}: PageProps<"/[locale]/admin/secrets">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSecrets");
  const tAuthHooks = await getTranslations("SendEmailHookSecretManagement");
  const tCron = await getTranslations("CronSecretManagement");

  // Fetch both secrets data
  const authHookData = await getSendEmailHookSecret();
  const cronData = await getCronSecret();

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-bold text-2xl">{t("title")}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("description")}
        </p>
      </div>

      <div className="space-y-8">
        {/* Auth Hooks Section */}
        <section>
          <div className="mb-4">
            <h3 className="font-bold text-xl">{tAuthHooks("title")}</h3>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
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
              isSetInEnv={authHookData.isSetInEnv}
              updatedAt={authHookData.updatedAt}
            />
          )}
        </section>

        {/* Cron Jobs Section */}
        <section>
          <div className="mb-4">
            <h3 className="font-bold text-xl">{tCron("title")}</h3>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {tCron("description")}
            </p>
          </div>

          {cronData.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cronData.error}</AlertDescription>
            </Alert>
          ) : (
            <CronSecretManagement
              hasSecret={cronData.hasSecret}
              isSetInEnv={cronData.isSetInEnv}
              updatedAt={cronData.updatedAt}
            />
          )}
        </section>
      </div>
    </div>
  );
}
