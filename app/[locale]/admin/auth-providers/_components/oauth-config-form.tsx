"use client";

import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  const [isClientIdSetInEnv, setIsClientIdSetInEnv] = useState(false);
  const [isClientSecretSetInEnv, setIsClientSecretSetInEnv] = useState(false);

  const getClientSecretPlaceholder = () => {
    if (isClientSecretSetInEnv) {
      return t("clientSecretPlaceholderEnvSet");
    }
    if (hasExistingSecret) {
      return t("clientSecretPlaceholderExisting");
    }
    return t("clientSecretPlaceholder");
  };

  const getClientSecretDescription = () => {
    if (isClientSecretSetInEnv) {
      return t("clientSecretDescriptionEnvSet");
    }
    if (hasExistingSecret) {
      return t("clientSecretDescriptionExisting");
    }
    return t("clientSecretDescription");
  };

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
        setIsClientIdSetInEnv(!!result.isClientIdSetInEnv);
        setIsClientSecretSetInEnv(!!result.isClientSecretSetInEnv);
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
        <span className="text-gray-600 text-sm dark:text-gray-400">{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${provider}-client-id`}>{t("clientIdLabel")}</Label>
          {isClientIdSetInEnv && (
            <Badge variant="secondary">{t("oauthEnvVarBadge")}</Badge>
          )}
        </div>
        <Input
          disabled={isClientIdSetInEnv}
          id={`${provider}-client-id`}
          onChange={(e) => setClientId(e.target.value)}
          placeholder={
            isClientIdSetInEnv
              ? t("clientIdPlaceholderEnvSet")
              : t("clientIdPlaceholder")
          }
          type="text"
          value={clientId}
        />
        <p className="text-gray-600 text-xs dark:text-gray-400">
          {isClientIdSetInEnv
            ? t("clientIdDescriptionEnvSet")
            : t("clientIdDescription")}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${provider}-client-secret`}>
            {t("clientSecretLabel")}
          </Label>
          {isClientSecretSetInEnv && (
            <Badge variant="secondary">{t("oauthEnvVarBadge")}</Badge>
          )}
        </div>
        <div className="relative">
          <Input
            disabled={isClientSecretSetInEnv}
            id={`${provider}-client-secret`}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={getClientSecretPlaceholder()}
            type={showSecret ? "text" : "password"}
            value={clientSecret}
          />
          <Button
            className="absolute top-0 right-0 h-full px-3"
            disabled={isClientSecretSetInEnv}
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
        <p className="text-gray-600 text-xs dark:text-gray-400">{getClientSecretDescription()}</p>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={isSaving || (isClientIdSetInEnv && isClientSecretSetInEnv)}
          onClick={handleSave}
        >
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
