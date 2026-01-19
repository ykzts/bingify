"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { InlineFieldError } from "@/components/field-errors";
import { FormErrors } from "@/components/form-errors";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { SmtpSettingsData } from "@/lib/data/smtp-settings";
import { getErrorMessage } from "@/lib/utils/error-message";
import {
  sendTestEmailAction,
  updateSmtpSettingsAction,
} from "../../_actions/smtp-settings";
import {
  smtpSettingsFormOpts,
  smtpSettingsFormSchema,
} from "../../_lib/form-options";

interface Props {
  initialSettings?: SmtpSettingsData | null;
}

export function SmtpSettingsForm({ initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSmtp");
  const [state, action] = useActionState(updateSmtpSettingsAction, undefined);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const form = useForm({
    ...smtpSettingsFormOpts,
    defaultValues: initialSettings
      ? {
          mail_from: initialSettings.mail_from,
          smtp_host: initialSettings.smtp_host,
          smtp_password: "", // Never pre-fill password for security
          smtp_port: initialSettings.smtp_port,
          smtp_secure: initialSettings.smtp_secure,
          smtp_user: initialSettings.smtp_user,
        }
      : smtpSettingsFormOpts.defaultValues,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: smtpSettingsFormSchema,
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

  const handleTestEmail = async () => {
    if (!testEmail || testEmail === "") {
      toast.error(t("errorNoTestEmail"));
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendTestEmailAction(testEmail);
      if (result.success) {
        toast.success(t("testEmailSuccess"));
      } else {
        toast.error(t(result.error || "errorSendFailed"));
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error(t("errorSendFailed"));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        action={action}
        className="space-y-6"
        noValidate
        onSubmit={() => form.handleSubmit()}
      >
        <FormErrors errors={formErrors} variant="with-icon" />

        <FieldSet>
          <FieldLegend>{t("smtpConnectionTitle")}</FieldLegend>
          <FieldGroup>
            <form.Field name="smtp_host">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("smtpHostLabel")}</FieldLabel>
                    <Input
                      disabled={isSubmitting}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="smtp.gmail.com"
                      type="text"
                      value={field.state.value as string}
                    />
                    <FieldDescription>{t("smtpHostHelp")}</FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <InlineFieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </InlineFieldError>
                    )}
                  </FieldContent>
                </Field>
              )}
            </form.Field>

            <form.Field name="smtp_port">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("smtpPortLabel")}</FieldLabel>
                    <Input
                      disabled={isSubmitting}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      placeholder="587"
                      type="number"
                      value={field.state.value as number}
                    />
                    <FieldDescription>{t("smtpPortHelp")}</FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <InlineFieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </InlineFieldError>
                    )}
                  </FieldContent>
                </Field>
              )}
            </form.Field>

            <form.Field name="smtp_secure">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id={field.name}
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <FieldLabel htmlFor={field.name}>
                        {t("smtpSecureLabel")}
                      </FieldLabel>
                    </div>
                    <FieldDescription>{t("smtpSecureHelp")}</FieldDescription>
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

        <FieldSet>
          <FieldLegend>{t("smtpAuthTitle")}</FieldLegend>
          <FieldGroup>
            <form.Field name="smtp_user">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("smtpUserLabel")}</FieldLabel>
                    <Input
                      autoComplete="username"
                      disabled={isSubmitting}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="user@example.com"
                      type="text"
                      value={field.state.value as string}
                    />
                    <FieldDescription>{t("smtpUserHelp")}</FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <InlineFieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </InlineFieldError>
                    )}
                  </FieldContent>
                </Field>
              )}
            </form.Field>

            <form.Field name="smtp_password">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("smtpPasswordLabel")}</FieldLabel>
                    <Input
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={
                        initialSettings ? t("passwordPlaceholder") : ""
                      }
                      type="password"
                      value={field.state.value as string}
                    />
                    <FieldDescription>{t("smtpPasswordHelp")}</FieldDescription>
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

        <FieldSet>
          <FieldLegend>{t("mailFromTitle")}</FieldLegend>
          <FieldGroup>
            <form.Field name="mail_from">
              {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
              {(field: any) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("mailFromLabel")}</FieldLabel>
                    <Input
                      disabled={isSubmitting}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="noreply@your-domain.com"
                      type="email"
                      value={field.state.value as string}
                    />
                    <FieldDescription>{t("mailFromHelp")}</FieldDescription>
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

      {initialSettings && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 font-semibold text-lg">{t("testEmailTitle")}</h3>
          <p className="mb-4 text-gray-600 text-sm">{t("testEmailHelp")}</p>
          <div className="flex gap-2">
            <Input
              disabled={isSendingTest}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t("testEmailPlaceholder")}
              type="email"
              value={testEmail}
            />
            <Button
              disabled={isSendingTest || !testEmail}
              onClick={handleTestEmail}
              type="button"
              variant="outline"
            >
              <Mail className="mr-2 size-4" />
              {isSendingTest ? t("sending") : t("sendTestButton")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
