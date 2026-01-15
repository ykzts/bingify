import { AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function AnnouncementNotFound() {
  const t = await getTranslations("Announcements");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </div>

      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("notFound")}</AlertTitle>
          <AlertDescription>{t("notFoundDescription")}</AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">{t("backToTop")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
