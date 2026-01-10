"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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

  // Handle key events when input is focused
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If metadata badge is shown, handle backspace/delete to remove entire badge
    if (metadata) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleDelete();
        inputRef.current?.focus();
        return;
      }
      // For other printable characters, delete badge and start typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleDelete();
        setInputValue(e.key);
        inputRef.current?.focus();
        return;
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
  const getBadgeText = () => {
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
            {/* Input field container - always visible for text field appearance */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Field container focuses hidden input on click */}
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Interactive field container */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Field container delegates to input */}
            <div
              className="flex min-h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              onClick={() => inputRef.current?.focus()}
            >
              {metadata ? (
                // Show badge inside the field
                <Badge className="flex items-center gap-1" variant="secondary">
                  <span>{getBadgeText()}</span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  />
                </Badge>
              ) : (
                // Show regular input
                <Input
                  className="h-auto border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
              )}
            </div>
            {/* Hidden input for accessibility */}
            {metadata && (
              <input
                className="sr-only"
                onKeyDown={handleKeyDown}
                ref={inputRef}
                tabIndex={0}
                type="text"
              />
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
