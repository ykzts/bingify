"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { AlertCircle, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";
import { FieldErrors } from "@/components/field-errors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emailChangeSchema } from "@/lib/schemas/user";
import { changeEmailAction } from "../_actions/account";
import { emailChangeFormOpts } from "../_lib/form-options";
import { ProfileSettingsFormCard } from "./profile-settings-form-card";

interface EmailChangeFormProps {
  currentEmail?: string | null;
}

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const t = useTranslations("EmailChangeSettings");
  const router = useRouter();

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(changeEmailAction, initialFormState);

  const form = useForm({
    ...emailChangeFormOpts,
    defaultValues: {
      email: "",
    },
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onChange: emailChangeSchema,
    },
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  // Track if we've already handled the current success state to prevent infinite loops
  const lastSuccessStateRef = useRef<typeof state>(null);

  // Use useEffectEvent to handle success without including functions in deps
  const handleSuccess = useEffectEvent(() => {
    toast.success(t("confirmationEmailSent"));
    form.reset();
    router.refresh();
  });

  useEffect(() => {
    // Check for successful update
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    // Only handle success if we haven't already handled this state
    if (meta?.success && state !== lastSuccessStateRef.current) {
      lastSuccessStateRef.current = state;
      handleSuccess();
    }
  }, [state]);

  return (
    <ProfileSettingsFormCard
      aboveFields={
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {currentEmail
              ? t("currentEmail", { email: currentEmail })
              : t("noEmailRegistered")}
          </AlertDescription>
        </Alert>
      }
      action={action}
      canSubmit={canSubmit}
      description={t("description")}
      formErrors={formErrors}
      icon={Mail}
      idleLabel={t("changeButton")}
      isSubmitting={isSubmitting}
      onSubmit={() => form.handleSubmit()}
      submittingLabel={t("changing")}
      title={t("title")}
    >
      <form.Field name="email">
        {(field) => (
          <Field>
            <FieldContent>
              <FieldLabel>{t("emailLabel")}</FieldLabel>
              <Input
                disabled={isSubmitting}
                maxLength={255}
                name={field.name}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                type="email"
                value={field.state.value as string}
              />
              <FieldDescription>{t("emailHelp")}</FieldDescription>
              <FieldErrors className="mt-2" errors={field.state.meta.errors} />
            </FieldContent>
          </Field>
        )}
      </form.Field>
    </ProfileSettingsFormCard>
  );
}
