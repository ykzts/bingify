"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { resetGame } from "../actions";

interface ResetGameButtonProps {
  spaceId: string;
}

export function ResetGameButton({ spaceId }: ResetGameButtonProps) {
  const t = useTranslations("AdminSpace");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    setShowConfirm(false);
    setError(null);

    startTransition(async () => {
      const result = await resetGame(spaceId);

      if (result.success) {
        toast.success(t("resetGameSuccess"), {
          duration: 3000,
        });
      } else {
        setError(result.error || t("resetGameError"));
      }
    });
  };

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
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirm}
            >
              {t("resetGameButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
