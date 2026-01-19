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
import { deleteCronSecret, upsertCronSecret } from "../_actions/cron-secret";

interface Props {
  hasSecret?: boolean;
  updatedAt?: string;
}

export function CronSecretManagement({ hasSecret, updatedAt }: Props) {
  const t = useTranslations("AdminSecrets");
  const confirm = useConfirm();
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsUpdating(true);

    try {
      const result = await upsertCronSecret(secret);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("cronSaveSuccess"));
        setSecret("");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!hasSecret) {
      return;
    }

    if (
      !(await confirm({
        description: t("deleteConfirm"),
        title: t("cronDeleteButton"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteCronSecret();

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("deleteSuccess"));
        setSecret("");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges = secret.trim() !== "";

  const getButtonLabel = () => {
    if (isUpdating) {
      return t("saving");
    }
    if (hasSecret) {
      return t("cronReplaceButton");
    }
    return t("saveButton");
  };

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
              placeholder={
                hasSecret
                  ? t("cronSecretPlaceholderReplace")
                  : t("cronSecretPlaceholder")
              }
              type={showSecret ? "text" : "password"}
              value={secret}
            />
            <Button
              aria-pressed={showSecret}
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
          <p className="text-gray-600 text-sm">
            {hasSecret ? t("secretHelpReplace") : t("secretHelp")}
          </p>
        </div>

        {/* Secret Status */}
        {hasSecret && updatedAt && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="font-medium text-green-800 text-sm">
              {t("secretConfigured")}
            </p>
            <p className="mt-1 text-green-700 text-xs">
              {t("lastUpdated", {
                date: new Date(updatedAt).toLocaleString(),
              })}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            disabled={!hasChanges || isUpdating || isDeleting}
            onClick={handleSave}
            type="button"
          >
            {getButtonLabel()}
          </Button>

          {hasSecret && (
            <Button
              disabled={isUpdating || isDeleting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? t("deleting") : t("cronDeleteButton")}
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
