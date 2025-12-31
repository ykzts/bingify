"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { closeSpace } from "../actions";

interface CloseSpaceButtonProps {
  spaceId: string;
}

export function CloseSpaceButton({ spaceId }: CloseSpaceButtonProps) {
  const t = useTranslations("AdminSpace");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    setError(null);

    startTransition(async () => {
      const result = await closeSpace(spaceId);

      if (result.success) {
        toast.success(t("closeSpaceSuccess"), {
          duration: 3000,
        });
        router.push(`/${locale}/dashboard`);
      } else {
        setError(result.error || t("closeSpaceError"));
      }
    });
  };

  return (
    <div>
      <AlertDialog onOpenChange={setShowConfirm} open={showConfirm}>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending} type="button" variant="destructive">
            {isPending ? t("closing") : t("closeSpaceButton")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("closeSpaceButton")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("closeSpaceConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t("closeSpaceButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
