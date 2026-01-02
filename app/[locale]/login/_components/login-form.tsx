"use client";

import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  GOOGLE_OAUTH_SCOPES,
  TWITCH_OAUTH_SCOPES,
} from "@/lib/auth/oauth-utils";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const t = useTranslations("Login");
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

  const handleOAuthLogin = async (provider: "google" | "twitch") => {
    setOauthError(null);
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: buildOAuthCallbackUrl(redirect ?? undefined),
        // Request provider-specific scopes to enable space gatekeeper verification
        // Google: YouTube readonly scope for subscription checks
        // Twitch: Follow and subscription read scopes
        ...(provider === "google" && { scopes: GOOGLE_OAUTH_SCOPES }),
        ...(provider === "twitch" && { scopes: TWITCH_OAUTH_SCOPES }),
      },
      provider,
    });

    if (error) {
      console.error("OAuth error:", error);
      setOauthError(error.message);
      setIsLoading(false);
    }
    // Note: If successful, user will be redirected, so no need to setIsLoading(false)
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    // Validate email
    if (!email?.includes("@")) {
      setEmailError(t("errorEmailInvalid"));
      return;
    }

    setIsEmailSending(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildOAuthCallbackUrl(redirect ?? undefined),
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

      <div className="space-y-3">
        <Button
          aria-label={t("googleButton")}
          className="w-full"
          disabled={isLoading}
          onClick={() => handleOAuthLogin("google")}
          type="button"
          variant="outline"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          ) : (
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
          )}
          {t("googleButton")}
        </Button>

        <Button
          aria-label={t("twitchButton")}
          className="w-full bg-twitch hover:bg-twitch-hover"
          disabled={isLoading}
          onClick={() => handleOAuthLogin("twitch")}
          type="button"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <title>Twitch</title>
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
            </svg>
          )}
          {t("twitchButton")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-gray-500 text-sm">{t("orDivider")}</span>
        <Separator className="flex-1" />
      </div>

      <Collapsible onOpenChange={setShowEmailForm} open={showEmailForm}>
        <CollapsibleTrigger asChild>
          <Button className="w-full" type="button" variant="ghost">
            <Mail className="h-4 w-4" />
            {t("emailButton")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
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

          <form className="space-y-4" onSubmit={handleMagicLinkLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailInputLabel")}</Label>
              <Input
                disabled={isEmailSending}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
