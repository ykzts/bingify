"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
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

  // Get provider status from providers array
  const getProviderStatus = (providerName: string): boolean => {
    const provider = providers.find((p) => p.provider === providerName);
    return provider?.is_enabled ?? false;
  };

  const youtubeEnabled = getProviderStatus("google");
  const twitchEnabled = getProviderStatus("twitch");
  const emailEnabled = getProviderStatus("email");

  return (
    <div className="space-y-6">
      <FormErrors errors={formErrors} variant="with-icon" />

      {/* YouTube Provider */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">YouTube</h3>
            <p className="mt-1 text-gray-600 text-sm">
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
        </div>

        <form action={action} noValidate onSubmit={() => form.handleSubmit()}>
          <div className="space-y-4 border-gray-200 border-t pt-4">
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

          <div className="mt-4 flex justify-end border-gray-200 border-t pt-4">
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? tSettings("saving") : tSettings("saveButton")}
            </Button>
          </div>
        </form>
      </div>

      {/* Twitch Provider */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Twitch</h3>
            <p className="mt-1 text-gray-600 text-sm">
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
        </div>

        <form action={action} noValidate onSubmit={() => form.handleSubmit()}>
          <div className="space-y-4 border-gray-200 border-t pt-4">
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

          <div className="mt-4 flex justify-end border-gray-200 border-t pt-4">
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? tSettings("saving") : tSettings("saveButton")}
            </Button>
          </div>
        </form>
      </div>

      {/* Email Provider */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Email</h3>
            <p className="mt-1 text-gray-600 text-sm">
              {t("emailProviderDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm" htmlFor="provider-email">
              {emailEnabled ? t("enabled") : t("disabled")}
            </Label>
            <Switch
              checked={emailEnabled}
              disabled={isUpdatingProvider === "email"}
              id="provider-email"
              onCheckedChange={() =>
                handleProviderToggle("email", emailEnabled)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
