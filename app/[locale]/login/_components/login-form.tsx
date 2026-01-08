"use client";

import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { OAuthButton } from "@/components/oauth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  buildOAuthCallbackUrl,
  getScopesForProvider,
} from "@/lib/auth/oauth-utils";
import type { AuthProvider } from "@/lib/data/auth-providers";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/client";
import { getAbsoluteUrl } from "@/lib/utils/url";

const emailSchema = z.object({
  email: z.string().email(),
});

interface Props {
  providers: AuthProvider[];
  systemSettings: SystemSettings;
}

// Email form component to reduce complexity
function EmailLoginForm({
  email,
  emailError,
  emailSuccess,
  isEmailSending,
  onEmailChange,
  onSubmit,
  t,
}: {
  email: string;
  emailError: string | null;
  emailSuccess: boolean;
  isEmailSending: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-4">
      {emailSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 text-sm">{t("emailSuccess")}</p>
        </div>
      )}

      {emailError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 text-sm">{emailError}</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t("emailInputLabel")}</Label>
          <Input
            disabled={isEmailSending}
            id="email"
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={t("emailInputPlaceholder")}
            type="email"
            value={email}
          />
        </div>
        <Button className="w-full" disabled={isEmailSending} type="submit">
          {isEmailSending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isEmailSending ? t("emailSending") : t("emailSendButton")}
        </Button>
      </form>
    </div>
  );
}

export function LoginForm({ providers, systemSettings }: Props) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  const handleOAuthLogin = async (provider: string) => {
    setOauthError(null);
    setIsLoading(true);
    const supabase = createClient();

    // システム設定に基づいてスコープを取得
    const scopes = getScopesForProvider(provider, systemSettings);

    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        queryParams:
          provider === "google"
            ? {
                access_type: "offline",
                prompt: "consent",
              }
            : undefined,
        redirectTo: buildOAuthCallbackUrl(provider, redirect ?? undefined),
        scopes,
      },
      provider: provider as "google" | "twitch",
    });

    if (error) {
      console.error("OAuth error:", error);
      setOauthError(error.message);
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(t("errorEmailInvalid"));
      return;
    }

    setIsEmailSending(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          language: locale,
        },
        // Email OTP uses the non-provider-specific callback route
        emailRedirectTo: `${getAbsoluteUrl()}/auth/callback${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
      },
    });

    setIsEmailSending(false);

    if (error) {
      console.error("Magic Link error:", error);
      setEmailError(error.message);
    } else {
      setEmailSuccess(true);
      setEmail("");
    }
  };

  const displayError = error || oauthError;

  return (
    <div className="mx-auto max-w-md space-y-6 p-8">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      {displayError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800 text-sm">
            {error ? t("errorMessage") : displayError}
          </p>
        </div>
      )}

      {providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((provider) => (
            <OAuthButton
              isLoading={isLoading}
              key={provider.provider}
              onClick={() => handleOAuthLogin(provider.provider)}
              provider={provider}
            />
          ))}
        </div>
      )}

      {providers.length > 0 && (
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-gray-500 text-sm">{t("orDivider")}</span>
          <Separator className="flex-1" />
        </div>
      )}

      {providers.length > 0 ? (
        <Collapsible onOpenChange={setShowEmailForm} open={showEmailForm}>
          <CollapsibleTrigger asChild>
            <Button className="w-full" type="button" variant="ghost">
              <Mail className="h-4 w-4" />
              {showEmailForm ? t("closeEmailForm") : t("emailButton")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <Card>
              <CardContent className="pt-6">
                <EmailLoginForm
                  email={email}
                  emailError={emailError}
                  emailSuccess={emailSuccess}
                  isEmailSending={isEmailSending}
                  onEmailChange={setEmail}
                  onSubmit={handleMagicLinkLogin}
                  t={t}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <EmailLoginForm
              email={email}
              emailError={emailError}
              emailSuccess={emailSuccess}
              isEmailSending={isEmailSending}
              onEmailChange={setEmail}
              onSubmit={handleMagicLinkLogin}
              t={t}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
