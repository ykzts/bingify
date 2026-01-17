"use client";

import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteEmailHookSecret,
  upsertEmailHookSecret,
} from "../_actions/email-hook-secret";

interface Props {
  initialSecret?: string;
  updatedAt?: string;
}

export function EmailHookSecretManagement({ initialSecret, updatedAt }: Props) {
  const t = useTranslations("AdminEmailHook");
  const confirm = useConfirm();
  const [secret, setSecret] = useState(initialSecret || "");
  const [showSecret, setShowSecret] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsUpdating(true);

    const result = await upsertEmailHookSecret(secret);

    if (result.error) {
      toast.error(t(result.error, { default: t("errorGeneric") }));
    } else {
      toast.success(t("saveSuccess"));
    }

    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!initialSecret) {
      return;
    }

    if (
      !(await confirm({
        description: t("deleteConfirm"),
        title: t("deleteButton"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsDeleting(true);

    const result = await deleteEmailHookSecret();

    if (result.error) {
      toast.error(t(result.error, { default: t("errorGeneric") }));
    } else {
      toast.success(t("deleteSuccess"));
      setSecret("");
    }

    setIsDeleting(false);
  };

  const isSecretValid = secret.trim().startsWith("v1,whsec_");
  const hasChanges = secret !== (initialSecret || "");

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{t("infoDescription")}</p>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              <li>{t("infoVaultEncryption")}</li>
              <li>{t("infoEnvFallback")}</li>
              <li>{t("infoFormat")}</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Secret Input Form */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="secret">{t("secretLabel")}</Label>
          <div className="relative">
            <Input
              className="pr-10 font-mono text-sm"
              disabled={isUpdating || isDeleting}
              id="secret"
              onChange={(e) => setSecret(e.target.value)}
              placeholder="v1,whsec_..."
              type={showSecret ? "text" : "password"}
              value={secret}
            />
            <Button
              className="absolute top-1/2 right-2 -translate-y-1/2"
              disabled={isUpdating || isDeleting}
              onClick={() => setShowSecret(!showSecret)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showSecret ? t("hideSecret") : t("showSecret")}
              </span>
            </Button>
          </div>
          <p className="text-gray-600 text-sm">{t("secretHelp")}</p>
        </div>

        {/* Validation Error */}
        {secret && !isSecretValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("errorInvalidFormat")}</AlertDescription>
          </Alert>
        )}

        {/* Last Updated Info */}
        {updatedAt && initialSecret && (
          <div className="text-gray-600 text-sm">
            {t("lastUpdated", {
              date: new Date(updatedAt).toLocaleString(),
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            disabled={
              !(secret && isSecretValid && hasChanges) ||
              isUpdating ||
              isDeleting
            }
            onClick={handleSave}
            type="button"
          >
            {isUpdating ? t("saving") : t("saveButton")}
          </Button>

          {initialSecret && (
            <Button
              disabled={isUpdating || isDeleting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? t("deleting") : t("deleteButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Environment Variable Warning */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">{t("envWarningTitle")}</p>
            <p>{t("envWarningDescription")}</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
