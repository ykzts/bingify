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
import { getErrorMessage } from "@/lib/utils/error-message";
import { YOUTUBE_CHANNEL_ID_REGEX } from "@/lib/youtube-constants";
import type { Tables } from "@/types/supabase";
import { getYouTubeMetadata } from "../_actions/get-metadata";
import { getOperatorYouTubeChannelId } from "../_actions/get-user-channel";
import { lookupYouTubeChannelIdWithOperatorToken } from "../_actions/operator-lookup";

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
  const [metadata, setMetadata] = useState<Tables<"youtube_channels"> | null>(
    null
  );
  const [_loadingMetadata, setLoadingMetadata] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch metadata when channel ID changes (from form state)
  useEffect(() => {
    if (enteredChannelId && YOUTUBE_CHANNEL_ID_REGEX.test(enteredChannelId)) {
      setLoadingMetadata(true);
      getYouTubeMetadata(enteredChannelId)
        .then((result) => {
          if (result.success && result.metadata) {
            setMetadata(result.metadata as Tables<"youtube_channels">);
            setInputValue(""); // Clear input when metadata is shown
          } else {
            setMetadata(null);
            setInputValue(enteredChannelId);
          }
        })
        .catch(() => {
          setMetadata(null);
          setInputValue(enteredChannelId);
        })
        .finally(() => {
          setLoadingMetadata(false);
        });
    } else if (enteredChannelId) {
      setInputValue(enteredChannelId);
      setMetadata(null);
    } else {
      setInputValue("");
      setMetadata(null);
    }
  }, [enteredChannelId]);

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

        // Immediately fetch and display metadata
        setLoadingMetadata(true);
        getYouTubeMetadata(result.channelId)
          .then((metadataResult) => {
            if (metadataResult.success && metadataResult.metadata) {
              setMetadata(
                metadataResult.metadata as Tables<"youtube_channels">
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
        convertYoutubeInput(inputValue);
      }
    }
  };

  // Handle delete
  const handleDelete = () => {
    field.handleChange("");
    setMetadata(null);
    setInputValue("");
    setYoutubeIdError(null);
  };

  // Format display text for badge
  const getDisplayText = () => {
    if (!metadata) {
      return "";
    }

    const handle = metadata.handle || "";
    // Handle should already be without @ from the database
    // But clean it just in case for backward compatibility
    const cleanHandle = handle.replace(AT_PREFIX_REGEX, "");

    if (cleanHandle) {
      return `@${cleanHandle} (${enteredChannelId.substring(0, 8)}...)`;
    }
    if (metadata.channel_title) {
      return `${metadata.channel_title} (${enteredChannelId.substring(0, 8)}...)`;
    }
    return enteredChannelId;
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>

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
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
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
