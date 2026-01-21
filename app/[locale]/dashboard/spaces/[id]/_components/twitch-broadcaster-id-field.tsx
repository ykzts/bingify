"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { TWITCH_ID_REGEX } from "@/lib/twitch";
import { getErrorMessage } from "@/lib/utils/error-message";
import { getOperatorTwitchBroadcasterId } from "../_actions/get-user-channel";
import { lookupTwitchBroadcasterIdWithOperatorToken } from "../_actions/operator-lookup";
import { registerTwitchBroadcasterMetadata } from "../_actions/register-metadata";
import { useTwitchMetadata } from "../_hooks/use-metadata";

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
  const queryClient = useQueryClient();
  const [twitchIdConverting, setTwitchIdConverting] = useState(false);
  const [twitchIdError, setTwitchIdError] = useState<string | null>(null);
  const [fetchingOperatorTwitchId, setFetchingOperatorTwitchId] =
    useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: metadata, isLoading: loadingMetadata } =
    useTwitchMetadata(enteredBroadcasterId);

  // 入力値の更新
  useEffect(() => {
    if (enteredBroadcasterId) {
      if (!metadata || loadingMetadata) {
        // メタデータ未取得時またはロード中は常にIDを表示
        setInputValue(enteredBroadcasterId);
      } else {
        // メタデータ取得時にクリア
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
  }, [enteredBroadcasterId, metadata, loadingMetadata]);

  // Convert Twitch username/URL to broadcaster ID
  const convertTwitchInput = async (input: string) => {
    if (!input || input.trim() === "") {
      setTwitchIdConverting(false);
      setTwitchIdError(null);
      return;
    }

    // すでにチャンネルIDの場合は変換不要
    if (TWITCH_ID_REGEX.test(input.trim())) {
      field.handleChange(input.trim());
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
        // Error is already translated from server
        setTwitchIdError(result.error);
        setTwitchIdConverting(false);
        return;
      }

      if (result.broadcasterId) {
        // Update the field value with the converted ID
        field.handleChange(result.broadcasterId);
        setTwitchIdError(null);
        setInputValue(""); // Clear input, metadata will be fetched by useQuery

        // メタデータを即座に登録
        registerTwitchBroadcasterMetadata(result.broadcasterId)
          .then(() => {
            // キャッシュを無効化して再取得
            queryClient.invalidateQueries({
              queryKey: ["twitch-metadata", result.broadcasterId],
            });
          })
          .catch((error) => {
            console.error("Failed to register Twitch metadata:", error);
          });
      }
    } catch (_error) {
      setTwitchIdError(t("twitchBroadcasterIdConvertError"));
    } finally {
      setTwitchIdConverting(false);
    }
  };

  // 操作者のTwitchブロードキャスターIDを取得してフィールドに設定
  const handleGetMyTwitchId = async () => {
    setFetchingOperatorTwitchId(true);
    setTwitchIdError(null);

    try {
      const result = await getOperatorTwitchBroadcasterId();

      if (result.error || !result.channelId) {
        // Error is already translated from server, fallback to local translation if undefined
        setTwitchIdError(result.error || t("twitchBroadcasterIdConvertError"));
        return;
      }

      // 取得したブロードキャスターIDを保存（権限チェック用）
      onOperatorIdFetched(result.channelId);

      // フィールドの値を更新
      field.handleChange(result.channelId);
      setTwitchIdError(null);

      // メタデータを即座に登録
      registerTwitchBroadcasterMetadata(result.channelId)
        .then(() => {
          // キャッシュを無効化して再取得
          queryClient.invalidateQueries({
            queryKey: ["twitch-metadata", result.channelId],
          });
        })
        .catch((error) => {
          console.error("Failed to register Twitch metadata:", error);
        });
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
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        return;
      }
      // For other printable characters, delete badge and start typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleDelete();
        setInputValue(e.key);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
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

  const renderInputContent = () => {
    if (loadingMetadata && enteredBroadcasterId) {
      return (
        <InputGroupAddon>
          <Badge className="flex items-center gap-1" variant="outline">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("loading")}</span>
            <div className="inline-flex h-3 w-3 items-center justify-center opacity-50">
              <X className="h-3 w-3" />
            </div>
          </Badge>
          <input
            className="sr-only"
            name={field.name}
            readOnly
            ref={inputRef}
            tabIndex={0}
            type="text"
            value={enteredBroadcasterId || ""}
          />
        </InputGroupAddon>
      );
    }
    if (metadata) {
      return (
        <InputGroupAddon>
          <Badge className="flex items-center gap-1" variant="outline">
            <span>{getBadgeText()}</span>
            <button
              aria-label={t("removeBroadcaster")}
              className="inline-flex h-3 w-3 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <input
            className="sr-only"
            name={field.name}
            onKeyDown={handleKeyDown}
            readOnly
            ref={inputRef}
            tabIndex={0}
            type="text"
            value={enteredBroadcasterId || ""}
          />
        </InputGroupAddon>
      );
    }
    return (
      <InputGroupInput
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
    );
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("twitchBroadcasterIdLabel")}</FieldLabel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <InputGroup>
              {renderInputContent()}
              {twitchIdConverting && !loadingMetadata && !metadata && (
                <InputGroupAddon align="inline-end">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                </InputGroupAddon>
              )}
            </InputGroup>
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
