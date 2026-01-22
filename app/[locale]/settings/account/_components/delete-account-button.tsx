"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "../_actions/account";

export function DeleteAccountButton() {
  const t = useTranslations("AccountSettings");
  const locale = useLocale();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const expectedText = t("deleteConfirmText");
  const isConfirmValid = confirmText === expectedText;

  const handleDelete = async () => {
    if (!isConfirmValid) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccount();

      if (result.success) {
        toast.success(t("deleteSuccess"));
        // Redirect to home page after successful deletion
        router.push(`/${locale}`);
      } else {
        toast.error(result.error || t("errorGeneric"));
        setIsDeleting(false);
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(t("errorGeneric"));
      setIsDeleting(false);
      setShowDialog(false);
    }
  };

  return (
    <AlertDialog onOpenChange={setShowDialog} open={showDialog}>
      <AlertDialogTrigger asChild>
        <Button
          className="gap-2"
          disabled={isDeleting}
          type="button"
          variant="destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t("deleteAccountButton")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteAccountTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{t("deleteAccountWarning")}</p>
            <p className="font-semibold text-red-600">
              {t("deleteAccountIrreversible")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-text">{t("deleteConfirmLabel")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("deleteConfirmInstruction", { text: expectedText })}
              </p>
              <Input
                disabled={isDeleting}
                id="confirm-text"
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expectedText}
                type="text"
                value={confirmText}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={!isConfirmValid || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? t("deleting") : t("deleteAccountConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
