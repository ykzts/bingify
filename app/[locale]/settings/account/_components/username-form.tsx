"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { AlertCircle, CheckCircle, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usernameSchema } from "@/lib/schemas/user";
import { getErrorMessage } from "@/lib/utils";
import { updateUsernameAction } from "../_lib/actions";
import { usernameFormOpts } from "../_lib/form-options";

interface UsernameFormProps {
  currentUsername?: string | null;
}

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const t = useTranslations("UsernameSettings");
  const router = useRouter();

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(
    updateUsernameAction,
    initialFormState
  );

  const form = useForm({
    ...usernameFormOpts,
    defaultValues: {
      username: currentUsername || "",
    },
    validators: {
      onChange: usernameSchema,
    },
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  useEffect(() => {
    // Check for successful update
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    if (meta?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-gray-600" />
        <h2 className="font-semibold text-lg">{t("title")}</h2>
      </div>

      <p className="mb-6 text-gray-600 text-sm">{t("description")}</p>

      <form action={action} className="space-y-4">
        {formErrors.length > 0 && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 text-sm"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {formErrors.map((error) => (
                <span key={getErrorMessage(error)}>
                  {t(getErrorMessage(error), { defaultValue: t("errorGeneric") })}
                </span>
              ))}
            </span>
          </div>
        )}

        <form.Field name="username">
          {(field) => (
            <Field>
              <FieldContent>
                <FieldLabel>{t("usernameLabel")}</FieldLabel>
                <Input
                  disabled={isSubmitting}
                  maxLength={50}
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t("usernamePlaceholder")}
                  required
                  type="text"
                  value={field.state.value as string}
                />
                <FieldDescription>{t("usernameHelp")}</FieldDescription>
                {field.state.meta.errors.length > 0 && (
                  <div
                    aria-live="polite"
                    className="mt-2 flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 text-sm"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {field.state.meta.errors.map((error) => (
                        <span key={getErrorMessage(error)}>
                          {t(getErrorMessage(error), {
                            defaultValue: t("errorGeneric"),
                          })}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </FieldContent>
            </Field>
          )}
        </form.Field>

        {(() => {
          const meta = (state as Record<string, unknown>)?.meta as
            | { success?: boolean }
            | undefined;
          return meta?.success ? (
            <div
              aria-live="polite"
              className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-800 text-sm"
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{t("updateSuccess")}</span>
            </div>
          ) : null;
        })()}

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("saveButton")
          )}
        </Button>
      </form>
    </div>
  );
}
