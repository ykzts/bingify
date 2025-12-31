"use client";

import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  buildOAuthCallbackUrl,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/auth/oauth-utils";
import { createClient } from "@/lib/supabase/client";
import { unlinkIdentity } from "../actions";

interface AccountLinkingFormProps {
  user: User;
}

type Provider = "google" | "twitch";

interface ProviderConfig {
  icon: React.ReactNode;
  label: string;
  name: Provider;
}

export function AccountLinkingForm({ user }: AccountLinkingFormProps) {
  const t = useTranslations("AccountSettings");
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const identities = user.identities || [];

  const providers: ProviderConfig[] = [
    {
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <title>Google</title>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      ),
      label: "Google",
      name: "google",
    },
    {
      icon: (
        <svg className="h-5 w-5 fill-current text-twitch" viewBox="0 0 24 24">
          <title>Twitch</title>
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
        </svg>
      ),
      label: "Twitch",
      name: "twitch",
    },
  ];

  const isLinked = (provider: Provider) => {
    return identities.some((identity) => identity.provider === provider);
  };

  const handleLink = async (provider: Provider) => {
    setError(null);
    setSuccess(null);
    setLoading(provider);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        options: {
          redirectTo: buildOAuthCallbackUrl(),
          // Request YouTube scope for Google to enable space gatekeeper verification
          ...(provider === "google" && { scopes: GOOGLE_OAUTH_SCOPES }),
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

  const handleUnlink = async (provider: Provider) => {
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
                  {provider.icon}
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="text-gray-500 text-sm">
                      {linked ? t("statusLinked") : t("statusNotLinked")}
                    </p>
                  </div>
                </div>

                <button
                  aria-label={
                    linked
                      ? `${t("disconnect")} ${provider.label}`
                      : `${t("connect")} ${provider.label}`
                  }
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    linked
                      ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      : "bg-primary text-white hover:opacity-90"
                  }`}
                  disabled={isLoading}
                  onClick={() =>
                    linked
                      ? handleUnlink(provider.name)
                      : handleLink(provider.name)
                  }
                  type="button"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!(isLoading || linked) && <LinkIcon className="h-4 w-4" />}
                  {isLoading && t("processing")}
                  {!isLoading && linked && t("disconnect")}
                  {!(isLoading || linked) && t("connect")}
                </button>
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
