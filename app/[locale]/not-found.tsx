import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="container mx-auto px-4 py-16">
      <Empty>
        <EmptyIcon>
          <FileQuestion className="h-20 w-20 text-muted-foreground" />
        </EmptyIcon>
        <EmptyTitle as="h1">{t("title")}</EmptyTitle>
        <EmptyDescription>{t("description")}</EmptyDescription>
        <EmptyAction>
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </EmptyAction>
      </Empty>
    </div>
  );
}
