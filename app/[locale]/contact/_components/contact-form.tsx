"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { Loader2, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { FormErrors } from "@/components/form-errors";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/utils/error-message";
import { submitContactFormAction } from "../_lib/actions";
import { contactFormOpts, contactFormSchema } from "../_lib/form-options";

interface Props {
  locale: string;
}

export function ContactForm({ locale }: Props) {
  const t = useTranslations("Contact");
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [state, action] = useActionState(
    submitContactFormAction,
    initialFormState
  );

  const form = useForm({
    ...contactFormOpts,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: contactFormSchema,
    },
    transform: useTransform(
      (baseForm) => (state ? mergeForm(baseForm, state) : baseForm),
      [state]
    ),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  useEffect(() => {
    if (
      state &&
      typeof state === "object" &&
      "meta" in state &&
      state.meta &&
      typeof state.meta === "object" &&
      "success" in state.meta &&
      "userEmail" in state.meta
    ) {
      const { success, userEmail } = state.meta as {
        success?: boolean;
        userEmail?: string;
      };
      if (success && userEmail) {
        router.push(
          `/${locale}/contact/complete?email=${encodeURIComponent(userEmail)}`
        );
      }
    }
  }, [state, router, locale]);

  return (
    <div className="w-full max-w-2xl rounded-lg border bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-purple-100 p-3">
          <Mail className="h-6 w-6 text-purple-600" />
        </div>
        <h1 className="font-bold text-2xl">{t("title")}</h1>
      </div>

      <p className="mb-6 text-gray-600">{t("description")}</p>

      <form action={action} noValidate>
        <FormErrors
          className="mb-4"
          errors={formErrors}
          title={t("errorTitle")}
          variant="with-icon"
        />

        <FieldGroup>
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
                <FieldContent>
                  <InputGroup>
                    <InputGroupInput
                      id="name"
                      name={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("namePlaceholder")}
                      required
                      value={field.state.value as string}
                    />
                  </InputGroup>
                  <FieldError
                    errors={field.state.meta.errors.map((msg) => ({
                      message: getErrorMessage(msg),
                    }))}
                  />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
                <FieldContent>
                  <InputGroup>
                    <InputGroupInput
                      id="email"
                      name={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("emailPlaceholder")}
                      required
                      type="email"
                      value={field.state.value as string}
                    />
                  </InputGroup>
                  <FieldError
                    errors={field.state.meta.errors.map((msg) => ({
                      message: getErrorMessage(msg),
                    }))}
                  />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="message">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="message">{t("messageLabel")}</FieldLabel>
                <FieldContent>
                  <Textarea
                    className="resize-none"
                    id="message"
                    name={field.name}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("messagePlaceholder")}
                    required
                    rows={8}
                    value={field.state.value as string}
                  />
                  <FieldDescription>{t("messageDescription")}</FieldDescription>
                  <FieldError
                    errors={field.state.meta.errors.map((msg) => ({
                      message: getErrorMessage(msg),
                    }))}
                  />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          {hasTurnstile && (
            <Field>
              <FieldContent>
                <TurnstileWidget onVerify={setTurnstileToken} />
              </FieldContent>
            </Field>
          )}

          <div className="flex justify-end">
            <Button
              disabled={isSubmitting || (hasTurnstile && !turnstileToken)}
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {t("submitButton")}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
