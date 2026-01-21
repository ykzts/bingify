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
import { useActionState, useEffect, useEffectEvent } from "react";
import { toast } from "sonner";
import { FormErrors } from "@/components/form-errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { updateSystemSettingsAction } from "../../_actions/system-settings";
import {
  systemSettingsFormOpts,
  systemSettingsFormSchema,
} from "../../_lib/form-options";

interface Props {
  initialSettings?: SystemSettings;
}

export function AuthProvidersForm({ initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSettings");

  const [state, action] = useActionState(updateSystemSettingsAction, undefined);

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

  // biome-ignore lint/suspicious/noExplicitAny: TanStack Form store state type
  const formValues = useStore(form.store, (state: any) => state.values);
  const youtubeEnabled =
    formValues.features?.gatekeeper?.youtube?.enabled ?? true;
  const twitchEnabled =
    formValues.features?.gatekeeper?.twitch?.enabled ?? true;

  const handleUpdateSuccess = useEffectEvent(() => {
    toast.success(t("updateSuccess"));
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

  return (
    <form
      action={action}
      className="space-y-6"
      noValidate
      onSubmit={() => form.handleSubmit()}
    >
      <FormErrors errors={formErrors} variant="with-icon" />

      <div className="space-y-4">
        <h4 className="font-semibold text-base">{t("featureFlagsTitle")}</h4>
        <p className="text-gray-600 text-sm dark:text-gray-400">
          {t("featureFlagsDescription")}
        </p>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h5 className="font-medium text-sm">
            {t("gatekeeperFeaturesTitle")}
          </h5>

          {/* YouTube Platform */}
          <div className="space-y-2">
            <form.Field name="features.gatekeeper.youtube.enabled">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.state.value as boolean}
                    disabled={isSubmitting}
                    id="features.gatekeeper.youtube.enabled"
                    name={field.name}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
                  />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="features.gatekeeper.youtube.enabled"
                  >
                    {t("gatekeeperYoutubeLabel")}
                  </Label>
                </div>
              )}
            </form.Field>

            {/* YouTube Requirement Types */}
            {youtubeEnabled && (
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4 dark:border-gray-700">
                <form.Field name="features.gatekeeper.youtube.member.enabled">
                  {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                  {(field: any) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.member.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.youtube.member.enabled"
                      >
                        {t("youtubeMemberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>

                <form.Field name="features.gatekeeper.youtube.subscriber.enabled">
                  {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                  {(field: any) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.subscriber.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.youtube.subscriber.enabled"
                      >
                        {t("youtubeSubscriberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>
            )}
          </div>

          {/* Twitch Platform */}
          <div className="space-y-2">
            <form.Field name="features.gatekeeper.twitch.enabled">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.state.value as boolean}
                    disabled={isSubmitting}
                    id="features.gatekeeper.twitch.enabled"
                    name={field.name}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
                  />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="features.gatekeeper.twitch.enabled"
                  >
                    {t("gatekeeperTwitchLabel")}
                  </Label>
                </div>
              )}
            </form.Field>

            {/* Twitch Requirement Types */}
            {twitchEnabled && (
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4 dark:border-gray-700">
                <form.Field name="features.gatekeeper.twitch.follower.enabled">
                  {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                  {(field: any) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.follower.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.twitch.follower.enabled"
                      >
                        {t("twitchFollowerLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>

                <form.Field name="features.gatekeeper.twitch.subscriber.enabled">
                  {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                  {(field: any) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.subscriber.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.twitch.subscriber.enabled"
                      >
                        {t("twitchSubscriberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>
            )}
          </div>

          {/* Email */}
          <form.Field name="features.gatekeeper.email.enabled">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.state.value as boolean}
                  disabled={isSubmitting}
                  id="features.gatekeeper.email.enabled"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="features.gatekeeper.email.enabled"
                >
                  {t("gatekeeperEmailLabel")}
                </Label>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex justify-end border-t pt-6">
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
