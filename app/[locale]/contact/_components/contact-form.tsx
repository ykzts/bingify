"use client";

import { Loader2, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
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
import { type ContactFormState, submitContactForm } from "../actions";

interface Props {
  locale: string;
}

export function ContactForm({ locale }: Props) {
  const t = useTranslations("Contact");
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [state, formAction, isPending] = useActionState<
    ContactFormState,
    FormData
  >(submitContactForm, {
    success: false,
  });

  useEffect(() => {
    if (state.success && state.userEmail) {
      router.push(
        `/${locale}/contact/complete?email=${encodeURIComponent(state.userEmail)}`
      );
    }
  }, [state.success, state.userEmail, router, locale]);

  return (
    <div className="w-full max-w-2xl rounded-lg border bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-purple-100 p-3">
          <Mail className="h-6 w-6 text-purple-600" />
        </div>
        <h1 className="font-bold text-2xl">{t("title")}</h1>
      </div>

      <p className="mb-6 text-gray-600">{t("description")}</p>

      <form action={formAction}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  aria-invalid={!!state.errors?.name}
                  id="name"
                  name="name"
                  placeholder={t("namePlaceholder")}
                  required
                />
              </InputGroup>
              <FieldError
                errors={state.errors?.name?.map((msg) => ({ message: msg }))}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  aria-invalid={!!state.errors?.email}
                  id="email"
                  name="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  type="email"
                />
              </InputGroup>
              <FieldError
                errors={state.errors?.email?.map((msg) => ({ message: msg }))}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="message">{t("messageLabel")}</FieldLabel>
            <FieldContent>
              <Textarea
                aria-invalid={!!state.errors?.message}
                className="resize-none"
                id="message"
                name="message"
                placeholder={t("messagePlaceholder")}
                required
                rows={8}
              />
              <FieldDescription>{t("messageDescription")}</FieldDescription>
              <FieldError
                errors={state.errors?.message?.map((msg) => ({ message: msg }))}
              />
            </FieldContent>
          </Field>

          {hasTurnstile && (
            <Field>
              <FieldContent>
                <TurnstileWidget onVerify={setTurnstileToken} />
                <FieldError
                  errors={state.errors?.turnstile?.map((msg) => ({
                    message: msg,
                  }))}
                />
              </FieldContent>
            </Field>
          )}

          {state.error && (
            <div className="rounded-md bg-red-50 p-4 text-red-600 text-sm">
              {state.error}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              disabled={isPending || (hasTurnstile && !turnstileToken)}
              size="lg"
              type="submit"
            >
              {isPending ? (
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
