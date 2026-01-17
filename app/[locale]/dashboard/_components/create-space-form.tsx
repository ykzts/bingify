"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { AlertCircle, AlertTriangle, Check, Dices } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { FormErrors } from "@/components/form-errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { formatDateSuffix } from "@/lib/utils/date-format";
import { getErrorMessage } from "@/lib/utils/error-message";
import { generateRandomKey } from "@/lib/utils/random-key";
import { getAbsoluteUrl } from "@/lib/utils/url";
import {
  checkShareKeyAvailability,
  createSpaceAction,
} from "../_actions/create-space";
import {
  createSpaceFormOpts,
  createSpaceFormSchema,
} from "../_lib/form-options";

const SUGGESTION_REGEX = /提案: (.+)/;

interface SuggestionDisplayProps {
  state: unknown;
  onAcceptSuggestion: () => void;
  t: (key: string) => string;
}

function SuggestionDisplay({
  state,
  onAcceptSuggestion,
  t,
}: SuggestionDisplayProps) {
  const stateRecord = state as Record<string, unknown>;
  const errorMap = stateRecord?.errorMap as Record<string, unknown> | undefined;
  const onChangeError =
    typeof errorMap?.onChange === "string" ? errorMap.onChange : null;

  if (!onChangeError?.includes("提案:")) {
    return null;
  }

  const suggestionMatch = onChangeError.match(SUGGESTION_REGEX);
  const suggestion = suggestionMatch?.[1] || "";

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <p className="mb-2 text-amber-800 text-sm dark:text-amber-200">
        {t("suggestionPrefix")}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm dark:bg-gray-800 dark:text-gray-200">
          {suggestion}
        </code>
        <Button onClick={onAcceptSuggestion} size="sm" type="button">
          {t("useSuggestionButton")}
        </Button>
      </div>
    </div>
  );
}

export function CreateSpaceForm() {
  const router = useRouter();
  const t = useTranslations("CreateSpace");
  const [shareKey, setShareKey] = useState("");
  const [debouncedShareKey] = useDebounce(shareKey, 500);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const dateSuffix = formatDateSuffix();

  // Use TanStack Form with Next.js server actions
  const [state, action, isPending] = useActionState(
    createSpaceAction,
    initialFormState
  );

  const form = useForm({
    ...createSpaceFormOpts,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onChange: createSpaceFormSchema,
    },
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  const handleShareKeyChange = (normalizedKey: string) => {
    setShareKey(normalizedKey);

    // Reset validation state when shareKey changes and is too short
    if (!normalizedKey || normalizedKey.length < 3) {
      setAvailable(null);
    }
  };

  useEffect(() => {
    if (!debouncedShareKey || debouncedShareKey.length < 3) {
      return;
    }

    const check = async () => {
      setChecking(true);
      try {
        const result = await checkShareKeyAvailability(debouncedShareKey);
        setAvailable(result.available);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [debouncedShareKey]);

  useEffect(() => {
    // Check for successful space creation
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean; spaceId?: string }
      | undefined;
    if (meta?.success && meta?.spaceId) {
      setIsNavigating(true);
      router.push(`/dashboard/spaces/${meta.spaceId}`);
    }
  }, [state, router]);

  useEffect(() => {
    // Extract server error from action state
    const stateRecord = state as Record<string, unknown>;
    if (stateRecord?.errorMap) {
      const errorMap = stateRecord.errorMap as Record<string, unknown>;
      if (errorMap.form && typeof errorMap.form === "string") {
        setServerError(errorMap.form);
      } else {
        setServerError(null);
      }
    } else {
      setServerError(null);
    }

    // Clear error on success
    const meta = stateRecord?.meta as { success?: boolean } | undefined;
    if (meta?.success) {
      setServerError(null);
    }
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-6"
      noValidate
      onSubmit={() => form.handleSubmit()}
    >
      <FormErrors
        className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
        errors={formErrors}
      />

      <form.Field name="share_key">
        {(field) => {
          const handleGenerateRandomKey = () => {
            const randomKey = generateRandomKey();
            setShareKey(randomKey);
            field.handleChange(randomKey);
            setAvailable(null);
          };

          return (
            <Field>
              <FieldLabel>共有キー</FieldLabel>

              <InputGroup className="mb-2">
                <InputGroupAddon align="inline-start">
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  className="rounded-none border-x-0 pr-10 font-mono"
                  disabled={isSubmitting || isPending || isNavigating}
                  maxLength={30}
                  minLength={3}
                  name={field.name}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const normalizedValue = newValue.toLowerCase();
                    field.handleChange(normalizedValue);
                    handleShareKeyChange(normalizedValue);
                  }}
                  pattern="[a-z0-9-]+"
                  placeholder="my-party"
                  required
                  type="text"
                  value={field.state.value as string}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={t("generateRandomButtonAriaLabel")}
                    disabled={isSubmitting || isPending || isNavigating}
                    onClick={handleGenerateRandomKey}
                    size="icon-xs"
                    title={t("generateRandomButton")}
                    type="button"
                  >
                    <Dices className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <InputGroupText className="rounded-lg rounded-l-none">
                    -{dateSuffix}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>

              <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-amber-800 text-sm dark:text-amber-200">
                  この共有キーを知っているユーザーは誰でも参加できます
                </p>
              </div>

              <p className="mb-2 text-gray-500 text-sm dark:text-gray-400">
                公開URL:{" "}
                <span className="font-mono">
                  {getAbsoluteUrl()}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    @{(field.state.value as string) || "..."}-{dateSuffix}
                  </span>
                </span>
              </p>

              {/* Status indicator */}
              {field.state.value.length >= 3 && (
                <div className="mt-2 flex items-center gap-2">
                  {checking && (
                    <>
                      <Spinner className="text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 text-sm dark:text-gray-400">
                        確認中...
                      </span>
                    </>
                  )}

                  {!checking && available === true && (
                    <>
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 text-sm dark:text-green-400">
                        この共有キーは使用可能です
                      </span>
                    </>
                  )}

                  {!checking && available === false && (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-600 text-sm dark:text-amber-400">
                        この共有キーは既に使用されています
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Field-level errors */}
              {field.state.meta.errors.length > 0 && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-red-800 text-sm dark:text-red-200"
                      key={getErrorMessage(error)}
                    >
                      {getErrorMessage(error)}
                    </p>
                  ))}
                </div>
              )}
            </Field>
          );
        }}
      </form.Field>

      <SuggestionDisplay
        onAcceptSuggestion={() => {
          // Extract suggestion from error map and update form field
          const stateRecord = state as Record<string, unknown>;
          if (
            stateRecord?.errorMap &&
            typeof stateRecord.errorMap === "object" &&
            stateRecord.errorMap !== null &&
            "onChange" in stateRecord.errorMap
          ) {
            const errorMap = stateRecord.errorMap as Record<string, unknown>;
            const errorMsg = errorMap.onChange;
            if (typeof errorMsg === "string" && errorMsg.includes("提案:")) {
              const suggestionMatch = errorMsg.match(SUGGESTION_REGEX);
              if (suggestionMatch) {
                const suggestion = suggestionMatch[1];
                const suggestionWithoutDate = suggestion.replace(
                  `-${dateSuffix}`,
                  ""
                );
                setShareKey(suggestionWithoutDate);
                form.setFieldValue("share_key", suggestionWithoutDate);
                setAvailable(null);
              }
            }
          }
        }}
        state={state}
        t={t}
      />

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Button
        className="w-full"
        disabled={
          !canSubmit ||
          isSubmitting ||
          isPending ||
          isNavigating ||
          checking ||
          available === false ||
          shareKey.length < 3
        }
        type="submit"
      >
        {(isSubmitting || isPending || isNavigating) && <Spinner />}
        {isSubmitting || isPending || isNavigating
          ? t("creatingButton")
          : t("createButton")}
      </Button>

      <p className="text-center text-gray-500 text-sm dark:text-gray-400">
        {t("settingsNotice")}
      </p>
    </form>
  );
}
