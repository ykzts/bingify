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
import { getErrorMessage } from "@/lib/utils/error-message";
import { YOUTUBE_CHANNEL_ID_REGEX } from "@/lib/youtube-constants";
import { getOperatorYouTubeChannelId } from "../_actions/get-user-channel";
import { lookupYouTubeChannelIdWithOperatorToken } from "../_actions/operator-lookup";
import { registerYouTubeChannelMetadata } from "../_actions/register-metadata";
import { useYouTubeMetadata } from "../_hooks/use-metadata";

// @ プレフィックスを除去
const AT_PREFIX_REGEX = /^@+/;

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: FieldApi type requires 23 generic parameters
  field: any;
  isPending: boolean;
  canUseMemberSubscriber: boolean;
  enteredChannelId: string;
  onOperatorIdFetched: (channelId: string) => void;
}

export function YoutubeChannelIdField({
  field,
  isPending,
  canUseMemberSubscriber,
  enteredChannelId,
  onOperatorIdFetched,
}: Props) {
  const t = useTranslations("SpaceSettings");
  const queryClient = useQueryClient();
  const [youtubeIdConverting, setYoutubeIdConverting] = useState(false);
  const [youtubeIdError, setYoutubeIdError] = useState<string | null>(null);
  const [fetchingOperatorYoutubeId, setFetchingOperatorYoutubeId] =
    useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: metadata, isLoading: loadingMetadata } =
    useYouTubeMetadata(enteredChannelId);

  // 入力値の更新
  useEffect(() => {
    if (enteredChannelId) {
      if (metadata) {
        setInputValue("");
      } else {
        setInputValue(enteredChannelId);
      }
    } else {
      setInputValue("");
    }
  }, [enteredChannelId, metadata]);

  // Convert YouTube handle/URL to channel ID
  const convertYoutubeInput = async (input: string) => {
    if (!input || input.trim() === "") {
      setYoutubeIdConverting(false);
      setYoutubeIdError(null);
      return;
    }

    const trimmedInput = input.trim();

    // すでにチャンネルIDの場合は変換不要
    if (YOUTUBE_CHANNEL_ID_REGEX.test(trimmedInput)) {
      field.handleChange(trimmedInput);
      setYoutubeIdConverting(false);
      setYoutubeIdError(null);
      return;
    }

    setYoutubeIdConverting(true);
    setYoutubeIdError(null);

    try {
      // Use operator's OAuth token for lookup
      const result =
        await lookupYouTubeChannelIdWithOperatorToken(trimmedInput);

      if (result.error) {
        // Translate error key
        setYoutubeIdError(t(result.error));
        setYoutubeIdConverting(false);
        return;
      }

      if (result.channelId) {
        // Update the field value with the converted ID
        field.handleChange(result.channelId);
        setYoutubeIdError(null);
        setInputValue(""); // Clear input, metadata will be fetched by useQuery

        // メタデータを即座に登録
        const registerResult = await registerYouTubeChannelMetadata(
          result.channelId
        );
        if (!registerResult.success) {
          setYoutubeIdError(t(registerResult.error || "youtubeRegisterError"));
          return;
        }

        // キャッシュを無効化して再取得
        queryClient.invalidateQueries({
          queryKey: ["youtube-metadata", result.channelId],
        });
      }
    } catch (_error) {
      setYoutubeIdError(t("youtubeChannelIdConvertError"));
    } finally {
      setYoutubeIdConverting(false);
    }
  };

  // 操作者のYouTubeチャンネルIDを取得してフィールドに設定
  const handleGetMyYoutubeId = async () => {
    setFetchingOperatorYoutubeId(true);
    setYoutubeIdError(null);

    try {
      const result = await getOperatorYouTubeChannelId();

      if (result.error || !result.channelId) {
        // エラーキーを翻訳
        setYoutubeIdError(t(result.error || "youtubeChannelIdConvertError"));
        return;
      }

      // 取得したチャンネルIDを保存（権限チェック用）
      onOperatorIdFetched(result.channelId);

      // フィールドの値を更新
      field.handleChange(result.channelId);
      setYoutubeIdError(null);

      // メタデータを即座に登録
      const registerResult = await registerYouTubeChannelMetadata(
        result.channelId
      );
      if (!registerResult.success) {
        setYoutubeIdError(t(registerResult.error || "youtubeRegisterError"));
        return;
      }

      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({
        queryKey: ["youtube-metadata", result.channelId],
      });
    } catch (_error) {
      setYoutubeIdError(t("youtubeChannelIdConvertError"));
    } finally {
      setFetchingOperatorYoutubeId(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleBlur = () => {
    if (inputValue && !metadata) {
      convertYoutubeInput(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        convertYoutubeInput(inputValue);
      }
    }
  };

  // Handle delete
  const handleDelete = () => {
    field.handleChange("");
    setInputValue("");
    setYoutubeIdError(null);
  };

  // Format display text for badge
  const getBadgeText = () => {
    if (!metadata) {
      return "";
    }

    const handle = metadata.handle || "";
    // Handle should already be without @ from the database
    // But clean it just in case for backward compatibility
    const cleanHandle = handle.replace(AT_PREFIX_REGEX, "");
    const shortId = enteredChannelId.substring(0, 8);

    if (cleanHandle) {
      return `@${cleanHandle} (${shortId}...)`;
    }
    if (metadata.channel_title) {
      return `${metadata.channel_title} (${shortId}...)`;
    }
    return enteredChannelId;
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <InputGroup>
              {(() => {
                if (loadingMetadata && enteredChannelId) {
                  return (
                    <InputGroupAddon>
                      <Badge
                        className="flex items-center gap-1"
                        variant="outline"
                      >
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
                        value={enteredChannelId || ""}
                      />
                    </InputGroupAddon>
                  );
                }
                if (metadata) {
                  return (
                    <InputGroupAddon>
                      <Badge
                        className="flex items-center gap-1"
                        variant="outline"
                      >
                        <span>{getBadgeText()}</span>
                        <button
                          aria-label={t("removeChannel")}
                          className="inline-flex h-3 w-3 cursor-pointer items-center justify-center"
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
                        value={enteredChannelId || ""}
                      />
                    </InputGroupAddon>
                  );
                }
                return (
                  <InputGroupInput
                    disabled={isPending || youtubeIdConverting}
                    name={field.name}
                    onBlur={handleBlur}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={t("youtubeChannelIdPlaceholder")}
                    ref={inputRef}
                    required={true}
                    type="text"
                    value={inputValue}
                  />
                );
              })()}
              {youtubeIdConverting && !loadingMetadata && !metadata && (
                <InputGroupAddon align="inline-end">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
          <Button
            disabled={
              isPending || youtubeIdConverting || fetchingOperatorYoutubeId
            }
            onClick={(e) => {
              e.preventDefault();
              handleGetMyYoutubeId();
            }}
            type="button"
            variant="outline"
          >
            {fetchingOperatorYoutubeId && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {fetchingOperatorYoutubeId ? t("fetchingMyId") : t("getMyIdButton")}
          </Button>
        </div>

        {field.state.meta.errors.length > 0 && (
          <FieldError>{getErrorMessage(field.state.meta.errors[0])}</FieldError>
        )}
        {youtubeIdError && <FieldError>{youtubeIdError}</FieldError>}
        {!canUseMemberSubscriber && enteredChannelId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("memberSubscriberOnlyOwnChannel")}
            </AlertDescription>
          </Alert>
        )}
        <FieldDescription>{t("youtubeChannelIdHelp")}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
