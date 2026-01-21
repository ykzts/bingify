"use client";

import { useForm } from "@tanstack/react-form-nextjs";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
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
import { Link } from "@/i18n/navigation";
import { buildAuthCallbackUrl } from "@/lib/auth/callback-url";
import {
  buildOAuthCallbackUrl,
  getScopesForProvider,
} from "@/lib/auth/oauth-utils";
import type { AuthProvider } from "@/lib/data/auth-providers";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/client";
import {
  emailLoginFormOpts,
  emailLoginFormSchema,
} from "../_lib/form-options";

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
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 text-sm dark:text-green-300">
            {t("emailSuccess")}
          </p>
        </div>
      )}

      {emailError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 text-sm dark:text-red-300">{emailError}</p>
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
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Use TanStack Form for email validation
  const form = useForm({
    ...emailLoginFormOpts,
    validators: {
      onChange: emailLoginFormSchema,
    },
  });

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
    setEmailSuccess(false);

    // Validate using TanStack Form validators
    form.validateAllFields("submit");

    const emailField = form.getFieldMeta("email");
    if (emailField?.errors && emailField.errors.length > 0) {
      return;
    }

    setIsEmailSending(true);
    const supabase = createClient();

    const email = form.getFieldValue("email") as string;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          language: locale,
        },
        // Email OTP uses the non-provider-specific callback route
        emailRedirectTo: buildAuthCallbackUrl(redirect ?? undefined),
      },
    });

    setIsEmailSending(false);

    if (error) {
      console.error("Magic Link error:", error);
      // Set field error
      form.setFieldMeta("email", (prev) => ({
        ...prev,
        errors: [error.message],
      }));
    } else {
      setEmailSuccess(true);
      form.reset();
    }
  };

  const displayError = error || oauthError;

  // Get email field errors for display
  const emailField = form.getFieldMeta("email");
  const emailError = emailField?.errors?.[0] || null;

  return (
    <div className="mx-auto max-w-md space-y-6 p-8">
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl dark:text-gray-100">{t("title")}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t("description")}</p>
      </div>

      {displayError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-800 text-sm dark:text-red-300">
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
          <span className="text-gray-500 text-sm dark:text-gray-400">
            {t("orDivider")}
          </span>
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
                  email={form.getFieldValue("email") as string}
                  emailError={emailError}
                  emailSuccess={emailSuccess}
                  isEmailSending={isEmailSending}
                  onEmailChange={(value) => form.setFieldValue("email", value)}
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
              email={form.getFieldValue("email") as string}
              emailError={emailError}
              emailSuccess={emailSuccess}
              isEmailSending={isEmailSending}
              onEmailChange={(value) => form.setFieldValue("email", value)}
              onSubmit={handleMagicLinkLogin}
              t={t}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-center text-gray-500 text-sm dark:text-gray-400">
        {t.rich("agreeToTerms", {
          privacyLink: (chunks) => (
            <Link
              className="text-purple-600 underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              href="/privacy"
            >
              {chunks}
            </Link>
          ),
          termsLink: (chunks) => (
            <Link
              className="text-purple-600 underline hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              href="/terms"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
