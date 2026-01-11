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
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { updateSystemSettingsAction } from "../_actions/system-settings";
import {
  systemSettingsFormOpts,
  systemSettingsFormSchema,
} from "../_lib/form-options";
import { SettingsFormContext } from "./settings-form-context";

interface Props {
  children: React.ReactNode;
  initialSettings?: SystemSettings;
}

export function SettingsFormWrapper({ children, initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSettings");

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(updateSystemSettingsAction, undefined);

  const form = useForm({
    ...systemSettingsFormOpts,
    defaultValues: initialSettings
      ? {
          archive_retention_days: Math.round(
            initialSettings.archive_retention_hours / 24
          ), // Convert hours to days for display
          default_user_role: initialSettings.default_user_role,
          features: initialSettings.features,
          max_participants_per_space:
            initialSettings.max_participants_per_space,
          max_spaces_per_user: initialSettings.max_spaces_per_user,
          max_total_spaces: initialSettings.max_total_spaces,
          space_expiration_hours: initialSettings.space_expiration_hours,
          spaces_archive_retention_days: Math.round(
            initialSettings.spaces_archive_retention_hours / 24
          ), // Convert hours to days for display
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
    <SettingsFormContext.Provider value={{ form, isSubmitting }}>
      <form
        action={action}
        className="space-y-6"
        noValidate
        onSubmit={() => form.handleSubmit()}
      >
        <FormErrors errors={formErrors} variant="with-icon" />

        {children}

        <div className="flex justify-end border-t pt-6">
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? t("saving") : t("saveButton")}
          </Button>
        </div>
      </form>
    </SettingsFormContext.Provider>
  );
}
