"use client";

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
import type { CreateSpaceState } from "./actions";
import { checkShareKeyAvailability, createSpace } from "./actions";

export function CreateSpaceForm() {
  const router = useRouter();
  const t = useTranslations("CreateSpace");
  const tErrors = useTranslations("Errors");
  const [shareKey, setShareKey] = useState("");
  const [debouncedShareKey] = useDebounce(shareKey, 500);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const dateSuffix = format(new Date(), "yyyyMMdd");

  const [state, formAction, isPending] = useActionState<
    CreateSpaceState,
    FormData
  >(createSpace, {
    success: false,
  });

  const handleShareKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newShareKey = e.target.value.toLowerCase();
    setShareKey(newShareKey);

    // Reset validation state when shareKey changes and is too short
    if (!newShareKey || newShareKey.length < 3) {
      setAvailable(null);
    }
  };

  const handleGenerateRandomKey = () => {
    const randomKey = generateRandomKey();
    setShareKey(randomKey);
    setAvailable(null);
  };

  const handleAcceptSuggestion = () => {
    if (state.suggestion) {
      // Extract the shareKey part from suggestion
      // Format: "my-party-2-20251226" or "my-party-3-20251226"
      // Remove the last part (date suffix): "-20251226"
      const suggestionWithoutDate = state.suggestion.replace(
        `-${dateSuffix}`,
        ""
      );
      setShareKey(suggestionWithoutDate);
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
    if (state.success && state.spaceId) {
      // Redirect to space detail page after creation (draft state)
      router.push(`/dashboard/spaces/${state.spaceId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      <Field>
        <FieldLabel>共有キー</FieldLabel>

        <InputGroup className="mb-2">
          <InputGroupAddon align="inline-start">
            <InputGroupText>@</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            className="rounded-none border-x-0 pr-10 font-mono"
            disabled={isPending}
            maxLength={30}
            minLength={3}
            name="share_key"
            onChange={handleShareKeyChange}
            pattern="[a-z0-9-]+"
            placeholder="my-party"
            required
            type="text"
            value={shareKey}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={t("generateRandomButtonAriaLabel")}
              onClick={handleGenerateRandomKey}
              size="icon-xs"
              title={t("generateRandomButton")}
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
              @{shareKey || "..."}-{dateSuffix}
            </span>
          </span>
        </p>

        {/* Status indicator */}
        {shareKey.length >= 3 && (
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
      </Field>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">
            {state.error === "maxSpacesReached" && state.errorData?.max
              ? tErrors("maxSpacesReached", { max: state.errorData.max })
              : state.error}
          </p>
          {state.suggestion && (
            <div className="mt-3">
              <p className="mb-2 text-red-700 text-sm">
                {t("suggestionPrefix")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
                  {state.suggestion}
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
        </div>
      )}

      <Button
        className="w-full"
        disabled={isPending || available === false || shareKey.length < 3}
        type="submit"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t("creatingButton") : t("createButton")}
      </Button>

      <p className="text-center text-gray-500 text-sm">{t("settingsNotice")}</p>
    </form>
  );
}
