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
import { InlineFieldError } from "@/components/field-errors";
import { FormErrors } from "@/components/form-errors";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type SystemSettings,
  systemSettingsSchema,
} from "@/lib/schemas/system-settings";
import { getErrorMessage } from "@/lib/utils/error-message";
import { updateSystemSettingsAction } from "../_lib/actions";
import { systemSettingsFormOpts } from "../_lib/form-options";

interface Props {
  initialSettings?: SystemSettings;
}

export function SystemSettingsForm({ initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSettings");

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(updateSystemSettingsAction, undefined);

  const form = useForm({
    ...systemSettingsFormOpts,
    defaultValues: initialSettings
      ? {
          default_user_role: initialSettings.default_user_role,
          features: initialSettings.features,
          max_participants_per_space:
            initialSettings.max_participants_per_space,
          max_spaces_per_user: initialSettings.max_spaces_per_user,
          max_total_spaces: initialSettings.max_total_spaces,
          space_expiration_hours: initialSettings.space_expiration_hours,
        }
      : systemSettingsFormOpts.defaultValues,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: systemSettingsSchema,
    },
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  // Get platform-level enabled states from nested form values
  const formValues = useStore(form.store, (state) => state.values);
  const youtubeEnabled =
    formValues.features?.gatekeeper?.youtube?.enabled ?? true;
  const twitchEnabled =
    formValues.features?.gatekeeper?.twitch?.enabled ?? true;

  // Use useEffectEvent to separate event logic from effect dependencies
  const handleUpdateSuccess = useEffectEvent(() => {
    toast.success(t("updateSuccess"));
    // Show success message briefly, then refresh
    setTimeout(() => {
      router.refresh();
    }, 1500);
  });

  useEffect(() => {
    // Check for successful update
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

      <FieldSet>
        <FieldLegend>リソース制限</FieldLegend>
        <FieldGroup>
          <form.Field name="max_participants_per_space">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxParticipantsLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={10_000}
                    min={1}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxParticipantsHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="max_spaces_per_user">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxSpacesPerUserLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100}
                    min={1}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxSpacesPerUserHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="max_total_spaces">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxTotalSpacesLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100_000}
                    min={0}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>{t("maxTotalSpacesHelp")}</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="space_expiration_hours">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("spaceExpirationLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={8760}
                    min={0}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("spaceExpirationHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="border-t pt-6">
        <FieldLegend>{t("userSettingsTitle")}</FieldLegend>
        <FieldGroup>
          <form.Field name="default_user_role">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("defaultUserRoleLabel")}</FieldLabel>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "organizer" | "user")
                    }
                    required
                    value={field.state.value as string}
                  >
                    <option value="organizer">{t("roleOrganizer")}</option>
                    <option value="user">{t("roleUser")}</option>
                  </select>
                  <FieldDescription>
                    {t("defaultUserRoleHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {getErrorMessage(field.state.meta.errors[0])}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      <div className="space-y-4 border-t pt-6">
        <h4 className="font-semibold text-base">{t("featureFlagsTitle")}</h4>
        <p className="text-gray-600 text-sm">{t("featureFlagsDescription")}</p>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h5 className="font-medium text-sm">
            {t("gatekeeperFeaturesTitle")}
          </h5>

          {/* YouTube Platform */}
          <div className="space-y-2">
            <form.Field name="features.gatekeeper.youtube.enabled">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <input
                    checked={field.state.value as boolean}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                    id="features.gatekeeper.youtube.enabled"
                    name={field.name}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    type="checkbox"
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
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4">
                <form.Field name="features.gatekeeper.youtube.member.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <input
                        checked={field.state.value as boolean}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.member.enabled"
                        name={field.name}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        type="checkbox"
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
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <input
                        checked={field.state.value as boolean}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.subscriber.enabled"
                        name={field.name}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        type="checkbox"
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
              {(field) => (
                <div className="flex items-center space-x-2">
                  <input
                    checked={field.state.value as boolean}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                    id="features.gatekeeper.twitch.enabled"
                    name={field.name}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    type="checkbox"
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
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4">
                <form.Field name="features.gatekeeper.twitch.follower.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <input
                        checked={field.state.value as boolean}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.follower.enabled"
                        name={field.name}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        type="checkbox"
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
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <input
                        checked={field.state.value as boolean}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.subscriber.enabled"
                        name={field.name}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        type="checkbox"
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
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  checked={field.state.value as boolean}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={isSubmitting}
                  id="features.gatekeeper.email.enabled"
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
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

      <div className="flex justify-end">
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
