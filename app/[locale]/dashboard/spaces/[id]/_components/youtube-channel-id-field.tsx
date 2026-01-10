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
import { getErrorMessage } from "@/lib/utils/error-message";
import { YOUTUBE_CHANNEL_ID_REGEX } from "@/lib/youtube-constants";
import { getOperatorYouTubeChannelId } from "../_actions/get-user-channel";
import { lookupYouTubeChannelIdWithOperatorToken } from "../_actions/operator-lookup";
import { useYouTubeMetadata } from "../_hooks/use-metadata";

// Regex to remove @ prefix
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
  const [youtubeIdConverting, setYoutubeIdConverting] = useState(false);
  const [youtubeIdError, setYoutubeIdError] = useState<string | null>(null);
  const [fetchingOperatorYoutubeId, setFetchingOperatorYoutubeId] =
    useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch metadata using React Query
  const { data: metadata, isLoading: loadingMetadata } =
    useYouTubeMetadata(enteredChannelId);

  // Update input value when channel ID changes
  useEffect(() => {
    if (enteredChannelId && !metadata && !loadingMetadata) {
      // Show channel ID in input if no metadata yet
      if (!YOUTUBE_CHANNEL_ID_REGEX.test(enteredChannelId)) {
        setInputValue(enteredChannelId);
      }
    } else if (!enteredChannelId) {
      setInputValue("");
    } else if (metadata) {
      setInputValue(""); // Clear input when metadata is available
    }
  }, [enteredChannelId, metadata, loadingMetadata]);

  // Convert YouTube handle/URL to channel ID
  const convertYoutubeInput = async (input: string) => {
    if (!input || input.trim() === "") {
      setYoutubeIdConverting(false);
      setYoutubeIdError(null);
      return;
    }

    // すでにチャンネルIDの場合は変換不要
    if (YOUTUBE_CHANNEL_ID_REGEX.test(input.trim())) {
      setYoutubeIdConverting(false);
      setYoutubeIdError(null);
      return;
    }

    setYoutubeIdConverting(true);
    setYoutubeIdError(null);

    try {
      // Use operator's OAuth token for lookup
      const result = await lookupYouTubeChannelIdWithOperatorToken(
        input.trim()
      );

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
    } catch (_error) {
      setYoutubeIdError(t("youtubeChannelIdConvertError"));
    } finally {
      setFetchingOperatorYoutubeId(false);
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
      convertYoutubeInput(inputValue);
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
                <Badge className="flex items-center gap-1" variant="outline">
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
              )}
              {youtubeIdConverting && !metadata && (
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
