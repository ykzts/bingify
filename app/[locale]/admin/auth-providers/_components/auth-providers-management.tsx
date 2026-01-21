"use client";

import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type AuthProviderRow,
  updateAuthProvider,
} from "../_actions/auth-providers";
import { OAuthConfigForm } from "./oauth-config-form";

interface Props {
  providers: AuthProviderRow[];
}

export function AuthProvidersManagement({ providers }: Props) {
  const t = useTranslations("AdminAuthProviders");
  const [localProviders, setLocalProviders] = useState(providers);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const handleToggle = async (provider: string, currentStatus: boolean) => {
    setIsUpdating(provider);

    const result = await updateAuthProvider(provider, !currentStatus);

    if (result.error) {
      toast.error(t(result.error));
    } else {
      toast.success(t("updateSuccess"));
      setLocalProviders((prev) =>
        prev.map((p) =>
          p.provider === provider ? { ...p, is_enabled: !currentStatus } : p
        )
      );
    }

    setIsUpdating(null);
  };

  const toggleExpand = (provider: string) => {
    setExpandedProvider((prev) => (prev === provider ? null : provider));
  };

  // Only show OAuth config for google and twitch
  const hasOAuthConfig = (provider: string) => {
    return provider === "google" || provider === "twitch";
  };

  return (
    <div className="space-y-4">
      {localProviders.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <p className="text-gray-600 text-sm dark:text-gray-400">{t("noProviders")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {localProviders.map((provider) => (
            <div
              className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              key={provider.provider}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">
                      {provider.label || provider.provider}
                    </div>
                    <div className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                      {t("providerIdLabel")}: {provider.provider}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label
                      className="text-sm"
                      htmlFor={`toggle-${provider.provider}`}
                    >
                      {provider.is_enabled ? t("enabled") : t("disabled")}
                    </Label>
                    <Switch
                      checked={provider.is_enabled}
                      disabled={isUpdating === provider.provider}
                      id={`toggle-${provider.provider}`}
                      onCheckedChange={() =>
                        handleToggle(provider.provider, provider.is_enabled)
                      }
                    />
                  </div>
                </div>
                {hasOAuthConfig(provider.provider) && (
                  <Button
                    className="ml-4"
                    onClick={() => toggleExpand(provider.provider)}
                    size="sm"
                    variant="ghost"
                  >
                    {expandedProvider === provider.provider ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {hasOAuthConfig(provider.provider) &&
                expandedProvider === provider.provider && (
                  <div className="border-gray-200 border-t bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <h4 className="mb-3 font-medium text-sm">
                      {t("oauthConfigTitle")}
                    </h4>
                    <OAuthConfigForm provider={provider.provider} />
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
