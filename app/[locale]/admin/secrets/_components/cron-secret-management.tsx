"use client";

import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteCronSecret, upsertCronSecret } from "../_actions/cron-secret";

interface Props {
  hasSecret?: boolean;
  isSetInEnv?: boolean;
  updatedAt?: string;
}

export function CronSecretManagement({
  hasSecret,
  isSetInEnv,
  updatedAt,
}: Props) {
  const t = useTranslations("AdminSecrets");
  const confirm = useConfirm();
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getPlaceholder = () => {
    if (isSetInEnv) {
      return t("cronSecretPlaceholderEnvSet");
    }
    if (hasSecret) {
      return t("cronSecretPlaceholderReplace");
    }
    return t("cronSecretPlaceholder");
  };

  const getHelpText = () => {
    if (isSetInEnv) {
      return t("cronSecretHelpEnvSet");
    }
    if (hasSecret) {
      return t("cronSecretHelpReplace");
    }
    return t("cronSecretHelp");
  };

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
        description: t("cronDeleteConfirm"),
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
        toast.success(t("cronDeleteSuccess"));
        setSecret("");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const hasChanges = secret.trim() !== "";

  const getButtonLabel = () => {
    if (isUpdating) {
      return t("cronSaving");
    }
    if (hasSecret) {
      return t("cronReplaceButton");
    }
    return t("cronSaveButton");
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{t("cronInfoDescription")}</p>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              <li>{t("cronInfoVaultEncryption")}</li>
              <li>{t("cronInfoEnvFallback")}</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Secret Input Form */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="secret">{t("cronSecretLabel")}</Label>
            {isSetInEnv && (
              <Badge variant="secondary">{t("cronEnvVarBadge")}</Badge>
            )}
          </div>
          <div className="relative">
            <Input
              className="pr-10 font-mono text-sm"
              disabled={isUpdating || isDeleting || isSetInEnv}
              id="secret"
              onChange={(e) => setSecret(e.target.value)}
              placeholder={getPlaceholder()}
              type={showSecret ? "text" : "password"}
              value={secret}
            />
            <Button
              aria-pressed={showSecret}
              className="absolute top-1/2 right-2 -translate-y-1/2"
              disabled={isUpdating || isDeleting || isSetInEnv}
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
                {showSecret ? t("cronHideSecret") : t("cronShowSecret")}
              </span>
            </Button>
          </div>
          <p className="text-gray-600 text-sm">{getHelpText()}</p>
        </div>

        {/* Secret Status */}
        {hasSecret && updatedAt && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="font-medium text-green-800 text-sm">
              {t("cronSecretConfigured")}
            </p>
            <p className="mt-1 text-green-700 text-xs">
              {t("cronLastUpdated", {
                date: new Date(updatedAt).toLocaleString(),
              })}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            disabled={!hasChanges || isUpdating || isDeleting || isSetInEnv}
            onClick={handleSave}
            type="button"
          >
            {getButtonLabel()}
          </Button>

          {hasSecret && !isSetInEnv && (
            <Button
              disabled={isUpdating || isDeleting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? t("cronDeleting") : t("cronDeleteButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Environment Variable Warning */}
      {isSetInEnv && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">{t("cronEnvWarningTitle")}</p>
              <p>{t("cronEnvWarningDescription")}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
