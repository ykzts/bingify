"use client";

import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { unlinkIdentity } from "@/app/[locale]/settings/_actions/account";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  getProviderLabel,
  ProviderIcon,
} from "@/components/providers/provider-icon";
import { Button } from "@/components/ui/button";
import {
  buildOAuthCallbackUrl,
  getScopesForProvider,
} from "@/lib/auth/oauth-utils";
import type { OAuthProvider } from "@/lib/oauth/token-storage";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/client";

interface AccountLinkingFormProps {
  systemSettings: SystemSettings;
  user: User;
}

interface ProviderConfig {
  label: string;
  name: OAuthProvider;
}

export function AccountLinkingForm({
  systemSettings,
  user,
}: AccountLinkingFormProps) {
  const t = useTranslations("AccountSettings");
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const identities = user.identities || [];

  const providers: ProviderConfig[] = [
    {
      label: getProviderLabel("google"),
      name: "google",
    },
    {
      label: getProviderLabel("twitch"),
      name: "twitch",
    },
  ];

  const isLinked = (provider: OAuthProvider) => {
    return identities.some((identity) => identity.provider === provider);
  };

  const handleLink = async (provider: OAuthProvider) => {
    setError(null);
    setSuccess(null);
    setLoading(provider);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        options: {
          ...(provider === "google" && {
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          }),
          redirectTo: buildOAuthCallbackUrl(provider),
          // Request scopes based on system settings for enabled gatekeeper features
          scopes: getScopesForProvider(provider, systemSettings),
        },
        provider,
      });

      if (error) {
        console.error("Link identity error:", error);
        setError(error.message);
        setLoading(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(t("errorGeneric"));
      setLoading(null);
    }
  };

  const handleUnlink = async (provider: OAuthProvider) => {
    if (identities.length <= 1) {
      setError(t("errorMinimumIdentity"));
      return;
    }

    const providerName = provider === "google" ? "Google" : "Twitch";
    if (
      !(await confirm({
        description: t("unlinkConfirm", { provider: providerName }),
        title: t("title"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(provider);

    try {
      const result = await unlinkIdentity(provider);

      if (result.success) {
        setSuccess(t("unlinkSuccess"));
        router.refresh();
      } else {
        setError(result.errorKey ? t(result.errorKey) : t("errorGeneric"));
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(t("errorGeneric"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">{t("linkedEmail")}</h2>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium">{t("registeredEmail")}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">{t("linkedAccounts")}</h2>

        <div className="space-y-3">
          {providers.map((provider) => {
            const linked = isLinked(provider.name);
            const isLoading = loading === provider.name;

            return (
              <div
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                key={provider.name}
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={provider.name} />
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="text-gray-500 text-sm">
                      {linked ? t("statusLinked") : t("statusNotLinked")}
                    </p>
                  </div>
                </div>

                <Button
                  aria-label={
                    linked
                      ? `${t("disconnect")} ${provider.label}`
                      : `${t("connect")} ${provider.label}`
                  }
                  disabled={isLoading}
                  onClick={() =>
                    linked
                      ? handleUnlink(provider.name)
                      : handleLink(provider.name)
                  }
                  type="button"
                  variant={linked ? "destructive" : "default"}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!(isLoading || linked) && <LinkIcon className="h-4 w-4" />}
                  {isLoading && t("processing")}
                  {!isLoading && linked && t("disconnect")}
                  {!(isLoading || linked) && t("connect")}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-amber-800 text-sm">{t("note")}</p>
      </div>
    </div>
  );
}
