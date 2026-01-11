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
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { getErrorMessage } from "@/lib/utils/error-message";
import { updateSystemSettingsAction } from "../../_actions/system-settings";
import {
  systemSettingsFormOpts,
  systemSettingsFormSchema,
} from "../../_lib/form-options";

interface Props {
  initialSettings?: SystemSettings;
}

export function ResourceLimitsForm({ initialSettings }: Props) {
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

      <FieldSet>
        <FieldGroup>
          <form.Field name="max_participants_per_space">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
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
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
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
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
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
        </FieldGroup>
      </FieldSet>

      <div className="flex justify-end border-t pt-6">
        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
