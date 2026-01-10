"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import type { Tables } from "@/types/supabase";
import { getTwitchMetadata } from "../_actions/get-metadata";
import { getOperatorTwitchBroadcasterId } from "../_actions/get-user-channel";
import { lookupTwitchBroadcasterIdWithOperatorToken } from "../_actions/operator-lookup";

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: FieldApi type requires 23 generic parameters
  field: any;
  isPending: boolean;
  canUseSubscriber: boolean;
  enteredBroadcasterId: string;
  onOperatorIdFetched: (broadcasterId: string) => void;
}

export function TwitchBroadcasterIdField({
  field,
  isPending,
  canUseSubscriber,
  enteredBroadcasterId,
  onOperatorIdFetched,
}: Props) {
  const t = useTranslations("SpaceSettings");
  const [twitchIdConverting, setTwitchIdConverting] = useState(false);
  const [twitchIdError, setTwitchIdError] = useState<string | null>(null);
  const [fetchingOperatorTwitchId, setFetchingOperatorTwitchId] =
    useState(false);
  const [metadata, setMetadata] =
    useState<Tables<"twitch_broadcasters"> | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [showInput, setShowInput] = useState(!enteredBroadcasterId);

  // Fetch metadata when broadcaster ID changes
  useEffect(() => {
    if (enteredBroadcasterId && TWITCH_ID_REGEX.test(enteredBroadcasterId)) {
      setLoadingMetadata(true);
      getTwitchMetadata(enteredBroadcasterId)
        .then((result) => {
          if (result.success && result.metadata) {
            setMetadata(result.metadata as Tables<"twitch_broadcasters">);
            setShowInput(false);
          } else {
            setMetadata(null);
            setShowInput(true);
          }
        })
        .catch(() => {
          setMetadata(null);
          setShowInput(true);
        })
        .finally(() => {
          setLoadingMetadata(false);
        });
    } else {
      setMetadata(null);
      setShowInput(true);
    }
  }, [enteredBroadcasterId]);

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

          // Immediately fetch and display metadata
          setLoadingMetadata(true);
          getTwitchMetadata(result.broadcasterId)
            .then((metadataResult) => {
              if (metadataResult.success && metadataResult.metadata) {
                setMetadata(
                  metadataResult.metadata as Tables<"twitch_broadcasters">
                );
                setShowInput(false);
              }
            })
            .catch(() => {
              // If metadata fetch fails, keep showing input
              setShowInput(true);
            })
            .finally(() => {
              setLoadingMetadata(false);
            });
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

  // Handle delete button click
  const handleDelete = () => {
    field.handleChange("");
    setMetadata(null);
    setShowInput(true);
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("twitchBroadcasterIdLabel")}</FieldLabel>

        {/* Display metadata as badge when available */}
        {metadata && !showInput && (
          <div className="flex items-center gap-2">
            <Badge
              className="flex items-center gap-2 px-3 py-2 text-sm"
              variant="secondary"
            >
              {loadingMetadata && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>
                {metadata.username ||
                  metadata.display_name ||
                  enteredBroadcasterId}{" "}
                ({enteredBroadcasterId})
              </span>
              <Button
                className="h-4 w-4 p-0 hover:bg-transparent"
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
            <Button
              onClick={(e) => {
                e.preventDefault();
                setShowInput(true);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("changeButton", { default: "Change" })}
            </Button>
          </div>
        )}

        {/* Input field for entering/editing broadcaster ID */}
        {showInput && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                disabled={isPending || twitchIdConverting}
                name={field.name}
                onChange={(e) => {
                  const value = e.target.value;
                  field.handleChange(value);
                  convertTwitchInput(value, {
                    setValue: (newValue: string) =>
                      field.handleChange(newValue),
                  });
                }}
                placeholder={t("twitchBroadcasterIdPlaceholder")}
                required={true}
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
              {fetchingOperatorTwitchId
                ? t("fetchingMyId")
                : t("getMyIdButton")}
            </Button>
          </div>
        )}

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
