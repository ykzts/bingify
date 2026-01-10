"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
  const [_loadingMetadata, setLoadingMetadata] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch metadata when channel ID changes (from form state)
  useEffect(() => {
    if (enteredBroadcasterId && TWITCH_ID_REGEX.test(enteredBroadcasterId)) {
      setLoadingMetadata(true);
      getTwitchMetadata(enteredBroadcasterId)
        .then((result) => {
          if (result.success && result.metadata) {
            setMetadata(result.metadata as Tables<"twitch_broadcasters">);
            setInputValue(""); // Clear input when metadata is shown
          } else {
            setMetadata(null);
            setInputValue(enteredBroadcasterId);
          }
        })
        .catch(() => {
          setMetadata(null);
          setInputValue(enteredBroadcasterId);
        })
        .finally(() => {
          setLoadingMetadata(false);
        });
    } else if (enteredBroadcasterId) {
      setInputValue(enteredBroadcasterId);
      setMetadata(null);
    } else {
      setInputValue("");
      setMetadata(null);
    }
  }, [enteredBroadcasterId]);

  // Convert YouTube handle/URL to channel ID
  const convertTwitchInput = async (input: string) => {
    if (!input || input.trim() === "") {
      setTwitchIdConverting(false);
      setTwitchIdError(null);
      return;
    }

    // すでにチャンネルIDの場合は変換不要
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
        field.handleChange(result.broadcasterId);
        setTwitchIdError(null);

        // Immediately fetch and display metadata
        setLoadingMetadata(true);
        getTwitchMetadata(result.broadcasterId)
          .then((metadataResult) => {
            if (metadataResult.success && metadataResult.metadata) {
              setMetadata(
                metadataResult.metadata as Tables<"twitch_broadcasters">
              );
              setInputValue(""); // Clear input when showing metadata badge
            }
          })
          .catch(() => {
            // If metadata fetch fails, show ID
            setMetadata(null);
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
  };

  // 操作者のYouTubeチャンネルIDを取得してフィールドに設定
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

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Don't trigger conversion while typing
  };

  // Handle blur - trigger conversion
  const handleBlur = () => {
    if (inputValue && !metadata) {
      convertTwitchInput(inputValue);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If metadata is shown and user presses any key except Tab, delete the metadata
    if (metadata && e.key !== "Tab") {
      e.preventDefault();
      handleDelete();
      // If it's a printable character, start typing with it
      if (e.key.length === 1) {
        setInputValue(e.key);
        inputRef.current?.focus();
      }
      return;
    }

    // Trigger conversion on Enter
    if (e.key === "Enter" || e.key === "Return") {
      e.preventDefault();
      if (inputValue && !metadata) {
        convertTwitchInput(inputValue);
      }
    }
  };

  // Handle delete
  const handleDelete = () => {
    field.handleChange("");
    setMetadata(null);
    setInputValue("");
    setTwitchIdError(null);
  };

  // Format display text for badge
  const getDisplayText = () => {
    if (!metadata) {
      return "";
    }

    const username = metadata.username || metadata.display_name || "";

    if (username) {
      return `${username} (${enteredBroadcasterId})`;
    }
    return enteredBroadcasterId;
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("twitchBroadcasterIdLabel")}</FieldLabel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            {metadata ? (
              // Show formatted text with border (no badge - just simple border)
              <Input
                className="flex cursor-default items-center gap-2 text-sm"
                onKeyDown={handleKeyDown}
                readOnly
                value={getDisplayText()}
              />
            ) : (
              // Show regular input
              <Input
                disabled={isPending || twitchIdConverting}
                name={field.name}
                onBlur={handleBlur}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t("twitchBroadcasterIdPlaceholder")}
                ref={inputRef}
                required={true}
                type="text"
                value={inputValue}
              />
            )}
            {twitchIdConverting && !metadata && (
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
