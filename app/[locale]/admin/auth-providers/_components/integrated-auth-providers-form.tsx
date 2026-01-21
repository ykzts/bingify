"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { FormErrors } from "@/components/form-errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { updateSystemSettingsAction } from "../../_actions/system-settings";
import {
  systemSettingsFormOpts,
  systemSettingsFormSchema,
} from "../../_lib/form-options";
import type { AuthProviderRow } from "../_actions/auth-providers";
import { updateAuthProvider } from "../_actions/auth-providers";
import { OAuthConfigForm } from "./oauth-config-form";

interface Props {
  providers: AuthProviderRow[];
  initialSettings?: SystemSettings;
}

export function IntegratedAuthProvidersForm({
  providers,
  initialSettings,
}: Props) {
  const router = useRouter();
  const t = useTranslations("AdminAuthProviders");
  const tSettings = useTranslations("AdminSettings");

  const [state, action] = useActionState(updateSystemSettingsAction, undefined);
  const [isUpdatingProvider, setIsUpdatingProvider] = useState<string | null>(
    null
  );
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const form = useForm({
    ...systemSettingsFormOpts,
    defaultValues: initialSettings
      ? {
          archive_retention_days: Math.round(
            initialSettings.archive_retention_hours / 24
          ),
          default_user_role: initialSettings.default_user_role,
          features: initialSettings.features,
          max_participants_per_space:
            initialSettings.max_participants_per_space,
          max_spaces_per_user: initialSettings.max_spaces_per_user,
          max_total_spaces: initialSettings.max_total_spaces,
          space_expiration_hours: initialSettings.space_expiration_hours,
          spaces_archive_retention_days: Math.round(
            initialSettings.spaces_archive_retention_hours / 24
          ),
        }
      : systemSettingsFormOpts.defaultValues,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: systemSettingsFormSchema,
    },
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  const handleUpdateSuccess = useEffectEvent(() => {
    toast.success(tSettings("updateSuccess"));
    setTimeout(() => {
      router.refresh();
    }, 1500);
  });

  useEffect(() => {
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    if (meta?.success) {
      handleUpdateSuccess();
    }
  }, [state]);

  const handleProviderToggle = async (
    provider: string,
    currentStatus: boolean
  ) => {
    setIsUpdatingProvider(provider);

    const result = await updateAuthProvider(provider, !currentStatus);

    if (result.error) {
      toast.error(t(result.error));
    } else {
      toast.success(t("updateSuccess"));
      setTimeout(() => {
        router.refresh();
      }, 500);
    }

    setIsUpdatingProvider(null);
  };

  const toggleExpand = (provider: string) => {
    setExpandedProvider((prev) => (prev === provider ? null : provider));
  };

  // Only show OAuth config for google and twitch
  const hasOAuthConfig = (provider: string) => {
    return provider === "google" || provider === "twitch";
  };

  // Get provider status from providers array
  const getProviderStatus = (providerName: string): boolean => {
    const provider = providers.find((p) => p.provider === providerName);
    return provider?.is_enabled ?? false;
  };

  const youtubeEnabled = getProviderStatus("google");
  const twitchEnabled = getProviderStatus("twitch");

  return (
    <form
      action={action}
      className="space-y-6"
      noValidate
      onSubmit={() => form.handleSubmit()}
    >
      <FormErrors errors={formErrors} variant="with-icon" />

      {/* YouTube Provider */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">YouTube</h3>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {t("youtubeProviderDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm" htmlFor="provider-google">
              {youtubeEnabled ? t("enabled") : t("disabled")}
            </Label>
            <Switch
              checked={youtubeEnabled}
              disabled={isUpdatingProvider === "google"}
              id="provider-google"
              onCheckedChange={() =>
                handleProviderToggle("google", youtubeEnabled)
              }
            />
          </div>
          {hasOAuthConfig("google") && (
            <Button
              className="ml-4"
              onClick={() => toggleExpand("google")}
              size="sm"
              type="button"
              variant="ghost"
            >
              {expandedProvider === "google" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {hasOAuthConfig("google") && expandedProvider === "google" && (
          <div className="border-gray-200 border-t bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <h4 className="mb-3 font-medium text-sm">
              {t("oauthConfigTitle")}
            </h4>
            <OAuthConfigForm provider="google" />
          </div>
        )}

        <div className="space-y-4 border-gray-200 border-t p-6 pt-4 dark:border-gray-700">
          <h4 className="font-medium text-sm">
            {t("gatekeeperRequirementsTitle")}
          </h4>

          <form.Field name="features.gatekeeper.youtube.member.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label
                  className={
                    youtubeEnabled
                      ? "cursor-pointer"
                      : "cursor-not-allowed text-gray-400"
                  }
                  htmlFor="youtube-member"
                >
                  {tSettings("youtubeMemberLabel")}
                </Label>
                <Switch
                  checked={field.state.value as boolean}
                  disabled={!youtubeEnabled || isSubmitting}
                  id="youtube-member"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              </div>
            )}
          </form.Field>

          <form.Field name="features.gatekeeper.youtube.subscriber.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label
                  className={
                    youtubeEnabled
                      ? "cursor-pointer"
                      : "cursor-not-allowed text-gray-400"
                  }
                  htmlFor="youtube-subscriber"
                >
                  {tSettings("youtubeSubscriberLabel")}
                </Label>
                <Switch
                  checked={field.state.value as boolean}
                  disabled={!youtubeEnabled || isSubmitting}
                  id="youtube-subscriber"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Twitch Provider */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Twitch</h3>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {t("twitchProviderDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm" htmlFor="provider-twitch">
              {twitchEnabled ? t("enabled") : t("disabled")}
            </Label>
            <Switch
              checked={twitchEnabled}
              disabled={isUpdatingProvider === "twitch"}
              id="provider-twitch"
              onCheckedChange={() =>
                handleProviderToggle("twitch", twitchEnabled)
              }
            />
          </div>
          {hasOAuthConfig("twitch") && (
            <Button
              className="ml-4"
              onClick={() => toggleExpand("twitch")}
              size="sm"
              type="button"
              variant="ghost"
            >
              {expandedProvider === "twitch" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {hasOAuthConfig("twitch") && expandedProvider === "twitch" && (
          <div className="border-gray-200 border-t bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <h4 className="mb-3 font-medium text-sm">
              {t("oauthConfigTitle")}
            </h4>
            <OAuthConfigForm provider="twitch" />
          </div>
        )}

        <div className="space-y-4 border-gray-200 border-t p-6 pt-4 dark:border-gray-700">
          <h4 className="font-medium text-sm">
            {t("gatekeeperRequirementsTitle")}
          </h4>

          <form.Field name="features.gatekeeper.twitch.follower.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label
                  className={
                    twitchEnabled
                      ? "cursor-pointer"
                      : "cursor-not-allowed text-gray-400"
                  }
                  htmlFor="twitch-follower"
                >
                  {tSettings("twitchFollowerLabel")}
                </Label>
                <Switch
                  checked={field.state.value as boolean}
                  disabled={!twitchEnabled || isSubmitting}
                  id="twitch-follower"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              </div>
            )}
          </form.Field>

          <form.Field name="features.gatekeeper.twitch.subscriber.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label
                  className={
                    twitchEnabled
                      ? "cursor-pointer"
                      : "cursor-not-allowed text-gray-400"
                  }
                  htmlFor="twitch-subscriber"
                >
                  {tSettings("twitchSubscriberLabel")}
                </Label>
                <Switch
                  checked={field.state.value as boolean}
                  disabled={!twitchEnabled || isSubmitting}
                  id="twitch-subscriber"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Email Provider */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between p-6">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Email</h3>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {t("emailProviderDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm">{t("enabled")}</Label>
            <Switch checked={true} disabled={true} id="provider-email" />
          </div>
        </div>

        <div className="space-y-4 border-gray-200 border-t p-6 pt-4 dark:border-gray-700">
          <h4 className="font-medium text-sm">
            {t("gatekeeperRequirementsTitle")}
          </h4>

          <form.Field name="features.gatekeeper.email.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer" htmlFor="email-gatekeeper">
                  {tSettings("gatekeeperEmailLabel")}
                </Label>
                <Switch
                  checked={field.state.value as boolean}
                  disabled={isSubmitting}
                  id="email-gatekeeper"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex justify-end border-gray-200 border-t pt-6">
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? tSettings("saving") : tSettings("saveButton")}
        </Button>
      </div>
    </form>
  );
}
