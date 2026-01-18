"use client";

import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProviderOAuthConfig,
  updateProviderOAuthConfig,
} from "../_actions/auth-providers";

interface Props {
  provider: string;
}

export function OAuthConfigForm({ provider }: Props) {
  const t = useTranslations("AdminAuthProviders");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingSecret, setHasExistingSecret] = useState(false);

  // Load existing configuration
  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      const result = await getProviderOAuthConfig(provider);

      if (result.error) {
        // Special handling for migration not applied - don't show as error toast
        if (
          result.error.includes("migration") ||
          result.error.includes("マイグレーション")
        ) {
          // Silently fail - the UI will show a message that OAuth config is not available
          setIsLoading(false);
          return;
        }
        toast.error(result.error);
      } else {
        setClientId(result.clientId || "");
        setHasExistingSecret(!!result.hasSecret);
      }

      setIsLoading(false);
    }

    loadConfig();
  }, [provider]);

  const handleSave = async () => {
    if (!clientId.trim()) {
      toast.error(t("errorClientIdRequired"));
      return;
    }

    setIsSaving(true);

    // Only send client secret if it's been modified
    const secretToSend = clientSecret.trim() ? clientSecret : undefined;

    const result = await updateProviderOAuthConfig(
      provider,
      clientId.trim(),
      secretToSend
    );

    if (result.error) {
      toast.error(t(result.error));
    } else {
      toast.success(t("oauthConfigSaved"));
      // If we saved a new secret, update the flag
      if (secretToSend) {
        setHasExistingSecret(true);
        setClientSecret(""); // Clear the input after successful save
      }
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-gray-600 text-sm">{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${provider}-client-id`}>{t("clientIdLabel")}</Label>
        <Input
          id={`${provider}-client-id`}
          onChange={(e) => setClientId(e.target.value)}
          placeholder={t("clientIdPlaceholder")}
          type="text"
          value={clientId}
        />
        <p className="text-gray-600 text-xs">{t("clientIdDescription")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${provider}-client-secret`}>
          {t("clientSecretLabel")}
        </Label>
        <div className="relative">
          <Input
            id={`${provider}-client-secret`}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={
              hasExistingSecret
                ? t("clientSecretPlaceholderExisting")
                : t("clientSecretPlaceholder")
            }
            type={showSecret ? "text" : "password"}
            value={clientSecret}
          />
          <Button
            className="absolute top-0 right-0 h-full px-3"
            onClick={() => setShowSecret(!showSecret)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showSecret ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-gray-600 text-xs">
          {hasExistingSecret
            ? t("clientSecretDescriptionExisting")
            : t("clientSecretDescription")}
        </p>
      </div>

      <div className="flex justify-end">
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("saveOAuthConfig")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
