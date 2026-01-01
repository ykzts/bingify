"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import type { ResetGameState } from "../actions";
import { resetGame } from "../actions";

interface ResetGameButtonProps {
  spaceId: string;
}

export function ResetGameButton({ spaceId }: ResetGameButtonProps) {
  const t = useTranslations("AdminSpace");
  const [showConfirm, setShowConfirm] = useState(false);

  const [resetState, resetAction, isPending] = useActionState<
    ResetGameState,
    FormData
  >(resetGame.bind(null, spaceId), {
    success: false,
  });

  useEffect(() => {
    if (resetState.success) {
      toast.success(t("resetGameSuccess"), {
        duration: 3000,
      });
      setShowConfirm(false);
    }
  }, [resetState.success, t]);

  return (
    <div>
      <AlertDialog onOpenChange={setShowConfirm} open={showConfirm}>
        <AlertDialogTrigger asChild>
          <Button disabled={isPending} type="button" variant="destructive">
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
            {isPending ? t("resetting") : t("resetGameButton")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetGameButton")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resetGameConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={resetAction}>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                type="submit"
              >
                {t("resetGameButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {resetState.error && (
        <p className="mt-2 text-red-600 text-sm">
          {resetState.error || t("resetGameError")}
        </p>
      )}
    </div>
  );
}
