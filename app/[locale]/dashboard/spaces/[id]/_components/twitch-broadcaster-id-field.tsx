"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TWITCH_ID_REGEX } from "@/lib/twitch";
import { getErrorMessage } from "@/lib/utils/error-message";
import { getOperatorTwitchBroadcasterId } from "../_lib/get-user-channel-actions";
import { lookupTwitchBroadcasterIdWithOperatorToken } from "../_lib/operator-lookup-actions";

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: FieldApi type requires 23 generic parameters
  field: any;
  isPending: boolean;
  requirement: string;
  canUseSubscriber: boolean;
  enteredBroadcasterId: string;
  onOperatorIdFetched: (broadcasterId: string) => void;
}

export function TwitchBroadcasterIdField({
  field,
  isPending,
  requirement,
  canUseSubscriber,
  enteredBroadcasterId,
  onOperatorIdFetched,
}: Props) {
  const t = useTranslations("SpaceSettings");
  const [twitchIdConverting, setTwitchIdConverting] = useState(false);
  const [twitchIdError, setTwitchIdError] = useState<string | null>(null);
  const [fetchingOperatorTwitchId, setFetchingOperatorTwitchId] =
    useState(false);

  // Debounced function to convert Twitch username/URL to ID
  const convertTwitchInput = useDebouncedCallback(
    async (input: string, fieldApi: { setValue: (value: string) => void }) => {
      if (!input || input.trim() === "") {
        setTwitchIdConverting(false);
        setTwitchIdError(null);
        return;
      }

      // すでにIDの場合は変換不要
      if (TWITCH_ID_REGEX.test(input.trim())) {
        setTwitchIdConverting(false);
        setTwitchIdError(null);
        return;
      }

      setTwitchIdConverting(true);
      setTwitchIdError(null);

      try {
        // Use operator's OAuth token for lookup
        const result = await lookupTwitchBroadcasterIdWithOperatorToken(
          input.trim()
        );

        if (result.error) {
          // Translate error key
          setTwitchIdError(t(result.error));
          setTwitchIdConverting(false);
          return;
        }

        if (result.broadcasterId) {
          // Update the field value with the converted ID
          fieldApi.setValue(result.broadcasterId);
          setTwitchIdError(null);
        }
      } catch (_error) {
        setTwitchIdError(t("twitchBroadcasterIdConvertError"));
      } finally {
        setTwitchIdConverting(false);
      }
    },
    800
  );

  // 操作者のTwitchブロードキャスターIDを取得してフィールドに設定
  const handleGetMyTwitchId = async () => {
    setFetchingOperatorTwitchId(true);
    setTwitchIdError(null);

    try {
      const result = await getOperatorTwitchBroadcasterId();

      if (result.error || !result.channelId) {
        // エラーキーを翻訳
        setTwitchIdError(t(result.error || "twitchBroadcasterIdConvertError"));
        return;
      }

      // 取得したブロードキャスターIDを保存（権限チェック用）
      onOperatorIdFetched(result.channelId);

      // フィールドの値を更新
      field.handleChange(result.channelId);
      setTwitchIdError(null);
    } catch (_error) {
      setTwitchIdError(t("twitchBroadcasterIdConvertError"));
    } finally {
      setFetchingOperatorTwitchId(false);
    }
  };

  if (requirement === "none") {
    return null;
  }

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("twitchBroadcasterIdLabel")}</FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              disabled={isPending || twitchIdConverting}
              name={field.name}
              onChange={(e) => {
                const value = e.target.value;
                field.handleChange(value);
                convertTwitchInput(value, {
                  setValue: (newValue: string) => field.handleChange(newValue),
                });
              }}
              placeholder={t("twitchBroadcasterIdPlaceholder")}
              required={requirement !== "none"}
              type="text"
              value={field.state.value as string}
            />
            {twitchIdConverting && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <Button
            disabled={
              isPending || twitchIdConverting || fetchingOperatorTwitchId
            }
            onClick={(e) => {
              e.preventDefault();
              handleGetMyTwitchId();
            }}
            type="button"
            variant="outline"
          >
            {fetchingOperatorTwitchId && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {fetchingOperatorTwitchId ? t("fetchingMyId") : t("getMyIdButton")}
          </Button>
        </div>
        {field.state.meta.errors.length > 0 && (
          <FieldError>{getErrorMessage(field.state.meta.errors[0])}</FieldError>
        )}
        {twitchIdError && <FieldError>{twitchIdError}</FieldError>}
        {!canUseSubscriber && enteredBroadcasterId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("memberSubscriberOnlyOwnChannel")}
            </AlertDescription>
          </Alert>
        )}
        <FieldDescription>{t("twitchBroadcasterIdHelp")}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
