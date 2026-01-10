"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  const [youtubeIdConverting, setTwitchIdConverting] = useState(false);
  const [youtubeIdError, setTwitchIdError] = useState<string | null>(null);
  const [fetchingOperatorYoutubeId, setFetchingOperatorTwitchId] =
    useState(false);
  const [metadata, setMetadata] = useState<Tables<"youtube_channels"> | null>(
    null
  );
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Fetch metadata when broadcaster ID changes (from form state)
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex metadata fetch and formatting logic
  useEffect(() => {
    if (enteredChannelId && YOUTUBE_CHANNEL_ID_REGEX.test(enteredChannelId)) {
      setLoadingMetadata(true);
      getYouTubeMetadata(enteredChannelId)
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex but necessary metadata formatting logic
        .then((result) => {
          if (result.success && result.metadata) {
            setMetadata(result.metadata as Tables<"youtube_channels">);
            // Update input to show formatted display
            const meta = result.metadata as Tables<"youtube_channels">;
            const handle = meta.handle || "";
            // Remove @ prefix if present to avoid double @@
            const displayHandle = handle.startsWith("@")
              ? handle.substring(1)
              : handle;

            let displayText: string;
            if (displayHandle) {
              displayText = `@${displayHandle} (${enteredChannelId.substring(0, 8)}...)`;
            } else if (meta.channel_title) {
              displayText = `${meta.channel_title} (${enteredChannelId.substring(0, 8)}...)`;
            } else {
              displayText = enteredChannelId;
            }
            setInputValue(displayText);
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

  // Convert Twitch username/URL to broadcaster ID
  const convertYoutubeInput = async (input: string) => {
    if (!input || input.trim() === "") {
      setTwitchIdConverting(false);
      setTwitchIdError(null);
      return;
    }

    // すでにIDの場合は変換不要
    if (YOUTUBE_CHANNEL_ID_REGEX.test(input.trim())) {
      setTwitchIdConverting(false);
      setTwitchIdError(null);
      return;
    }

    setTwitchIdConverting(true);
    setTwitchIdError(null);

    try {
      // Use operator's OAuth token for lookup
      const result = await lookupYouTubeChannelIdWithOperatorToken(
        input.trim()
      );

      if (result.error) {
        // Translate error key
        setTwitchIdError(t(result.error));
        setTwitchIdConverting(false);
        return;
      }

      if (result.channelId) {
        // Update the field value with the converted ID
        field.handleChange(result.channelId);
        setTwitchIdError(null);

        // Immediately fetch and display metadata
        setLoadingMetadata(true);
        getYouTubeMetadata(result.channelId)
          .then((metadataResult) => {
            if (metadataResult.success && metadataResult.metadata) {
              setMetadata(
                metadataResult.metadata as Tables<"youtube_channels">
              );
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
      setTwitchIdError(t("youtubeChannelIdConvertError"));
    } finally {
      setTwitchIdConverting(false);
    }
  };

  // 操作者のTwitchブロードキャスターIDを取得してフィールドに設定
  const handleGetMyYoutubeId = async () => {
    setFetchingOperatorTwitchId(true);
    setTwitchIdError(null);

    try {
      const result = await getOperatorYouTubeChannelId();

      if (result.error || !result.channelId) {
        // エラーキーを翻訳
        setTwitchIdError(t(result.error || "youtubeChannelIdConvertError"));
        return;
      }

      // 取得したブロードキャスターIDを保存（権限チェック用）
      onOperatorIdFetched(result.channelId);

      // フィールドの値を更新
      field.handleChange(result.channelId);
      setTwitchIdError(null);
    } catch (_error) {
      setTwitchIdError(t("youtubeChannelIdConvertError"));
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
      convertYoutubeInput(inputValue);
    }
  };

  // Handle Enter key - trigger conversion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    setTwitchIdError(null);
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              disabled={isPending || youtubeIdConverting}
              name={field.name}
              onBlur={handleBlur}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t("youtubeChannelIdPlaceholder")}
              required={true}
              type="text"
              value={inputValue}
            />
            {(youtubeIdConverting || loadingMetadata) && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {metadata && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 hover:opacity-70"
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                type="button"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
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
