"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type AuthProviderRow,
  updateAuthProvider,
} from "../_actions/auth-providers";

interface Props {
  providers: AuthProviderRow[];
}

export function AuthProvidersManagement({ providers }: Props) {
  const t = useTranslations("AdminAuthProviders");
  const [localProviders, setLocalProviders] = useState(providers);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleToggle = async (provider: string, currentStatus: boolean) => {
    setIsUpdating(provider);

    const result = await updateAuthProvider(provider, !currentStatus);

    if (result.error) {
      toast.error(t(result.error, { default: t("errorGeneric") }));
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

  return (
    <div className="space-y-4">
      {localProviders.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <AlertCircle className="h-5 w-5 text-gray-600" />
          <p className="text-gray-600 text-sm">{t("noProviders")}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {localProviders.map((provider) => (
            <div
              className="flex items-center justify-between p-4"
              key={provider.provider}
            >
              <div className="flex-1">
                <div className="font-medium">
                  {provider.label || provider.provider}
                </div>
                <div className="mt-1 text-gray-600 text-sm">
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
          ))}
        </div>
      )}
    </div>
  );
}
