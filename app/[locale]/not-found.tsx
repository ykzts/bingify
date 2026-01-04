import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/empty";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="container mx-auto px-4 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <FileQuestion className="h-20 w-20 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
