"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Dices,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { generateRandomKey } from "@/lib/utils/random-key";
import { getAbsoluteUrl } from "@/lib/utils/url";
import {
  checkShareKeyAvailability,
  createSpaceAction,
} from "./create-space-actions";
import { createSpaceFormOpts, createSpaceFormSchema } from "./form-options";

export function CreateSpaceForm() {
  const router = useRouter();
  const t = useTranslations("CreateSpace");
  const tErrors = useTranslations("Errors");
  const [shareKey, setShareKey] = useState("");
  const [debouncedShareKey] = useDebounce(shareKey, 500);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const dateSuffix = format(new Date(), "yyyyMMdd");

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(createSpaceAction, initialFormState);

  const form = useForm({
    ...createSpaceFormOpts,
    validators: {
      onChange: createSpaceFormSchema,
    },
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  const handleShareKeyChange = (newShareKey: string) => {
    const normalizedKey = newShareKey.toLowerCase();
    setShareKey(normalizedKey);

    // Reset validation state when shareKey changes and is too short
    if (!normalizedKey || normalizedKey.length < 3) {
      setAvailable(null);
    }
  };

  const handleGenerateRandomKey = () => {
    const randomKey = generateRandomKey();
    setShareKey(randomKey);
    setAvailable(null);
  };

  const handleAcceptSuggestion = () => {
    // Extract suggestion from error map
    const stateAny = state as any;
    if (
      stateAny?.errorMap &&
      typeof stateAny.errorMap === "object" &&
      "onChange" in stateAny.errorMap
    ) {
      const errorMsg = stateAny.errorMap.onChange;
      if (typeof errorMsg === "string" && errorMsg.includes("提案:")) {
        const suggestionMatch = errorMsg.match(/提案: (.+)/);
        if (suggestionMatch) {
          const suggestion = suggestionMatch[1];
          const suggestionWithoutDate = suggestion.replace(`-${dateSuffix}`, "");
          setShareKey(suggestionWithoutDate);
          setAvailable(null);
        }
      }
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
    const meta = (state as any)?.meta;
    if (meta?.success && meta?.spaceId) {
      router.push(`/dashboard/spaces/${meta.spaceId}`);
    }
  }, [state, router]);

  return (
    <form
      action={action as never}
      className="space-y-6"
      onSubmit={() => form.handleSubmit()}
    >
      {formErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          {formErrors.map((error) => (
            <p key={String(error)} className="text-red-800">
              {String(error)}
            </p>
          ))}
        </div>
      )}

      <form.Field name="share_key">
        {(field) => (
          <Field>
            <FieldLabel>共有キー</FieldLabel>

            <InputGroup className="mb-2">
              <InputGroupAddon align="inline-start">
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                className="rounded-none border-x-0 pr-10 font-mono"
                disabled={isSubmitting}
                maxLength={30}
                minLength={3}
                name={field.name}
                onChange={(e) => {
                  const newValue = e.target.value;
                  field.handleChange(newValue);
                  handleShareKeyChange(newValue);
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

            <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-amber-800 text-sm">
                この共有キーを知っているユーザーは誰でも参加できます
              </p>
            </div>

            <p className="mb-2 text-gray-500 text-sm">
              公開URL:{" "}
              <span className="font-mono">
                {getAbsoluteUrl()}/
                <span className="font-semibold text-gray-900">
                  @{(field.state.value as string) || "..."}-{dateSuffix}
                </span>
              </span>
            </p>

            {/* Status indicator */}
            {field.state.value.length >= 3 && (
              <div className="mt-2 flex items-center gap-2">
                {checking && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-gray-500 text-sm">確認中...</span>
                  </>
                )}

                {!checking && available === true && (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 text-sm">
                      この共有キーは使用可能です
                    </span>
                  </>
                )}

                {!checking && available === false && (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-600 text-sm">
                      この共有キーは既に使用されています
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Field-level errors */}
            {field.state.meta.errors.length > 0 && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                {field.state.meta.errors.map((error) => (
                  <p key={String(error)} className="text-red-800 text-sm">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </Field>
        )}
      </form.Field>

      {/* Show suggestion if available */}
      {(() => {
        const stateAny = state as any;
        return (
          stateAny?.errorMap &&
          typeof stateAny.errorMap === "object" &&
          "onChange" in stateAny.errorMap &&
          typeof stateAny.errorMap.onChange === "string" &&
          stateAny.errorMap.onChange.includes("提案:")
        );
      })() && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-amber-800 text-sm">
              {t("suggestionPrefix")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
                {(() => {
                  const stateAny = state as any;
                  return typeof stateAny?.errorMap?.onChange === "string"
                    ? stateAny.errorMap.onChange.match(/提案: (.+)/)?.[1]
                    : "";
                })()}
              </code>
              <Button
                onClick={handleAcceptSuggestion}
                size="sm"
                type="button"
                variant="destructive"
              >
                {t("useSuggestionButton")}
              </Button>
            </div>
          </div>
        )}

      <Button
        className="w-full"
        disabled={isSubmitting || available === false || shareKey.length < 3}
        type="submit"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? t("creatingButton") : t("createButton")}
      </Button>

      <p className="text-center text-gray-500 text-sm">{t("settingsNotice")}</p>
    </form>
  );
}
