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
  requirement: string;
  canUseMemberSubscriber: boolean;
  enteredChannelId: string;
  onOperatorIdFetched: (channelId: string) => void;
}

export function YoutubeChannelIdField({
  field,
  isPending,
  requirement,
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
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [showInput, setShowInput] = useState(!enteredChannelId);

  // Fetch metadata when channel ID changes
  useEffect(() => {
    if (enteredChannelId && YOUTUBE_CHANNEL_ID_REGEX.test(enteredChannelId)) {
      setLoadingMetadata(true);
      getYouTubeMetadata(enteredChannelId)
        .then((result) => {
          if (result.success && result.metadata) {
            setMetadata(result.metadata as Tables<"youtube_channels">);
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
  }, [enteredChannelId]);

  // Debounced function to convert YouTube handle/URL to channel ID
  const convertYoutubeInput = useDebouncedCallback(
    async (input: string, fieldApi: { setValue: (value: string) => void }) => {
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
          fieldApi.setValue(result.channelId);
          setYoutubeIdError(null);
        }
      } catch (_error) {
        setYoutubeIdError(t("youtubeChannelIdConvertError"));
      } finally {
        setYoutubeIdConverting(false);
      }
    },
    800
  );

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

  // Handle delete button click
  const handleDelete = () => {
    field.handleChange("");
    setMetadata(null);
    setShowInput(true);
  };

  if (requirement === "none") {
    return null;
  }

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>

        {/* Display metadata as badge when available */}
        {metadata && !showInput && (
          <div className="flex items-center gap-2">
            <Badge
              className="flex items-center gap-2 px-3 py-2 text-sm"
              variant="secondary"
            >
              {loadingMetadata && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>
                {metadata.handle || metadata.channel_title || enteredChannelId}{" "}
                ({enteredChannelId.substring(0, 8)}...)
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

        {/* Input field for entering/editing channel ID */}
        {showInput && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                disabled={isPending || youtubeIdConverting}
                name={field.name}
                onChange={(e) => {
                  const value = e.target.value;
                  field.handleChange(value);
                  convertYoutubeInput(value, {
                    setValue: (newValue: string) =>
                      field.handleChange(newValue),
                  });
                }}
                placeholder={t("youtubeChannelIdPlaceholder")}
                required={requirement !== "none"}
                type="text"
                value={field.state.value as string}
              />
              {youtubeIdConverting && (
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
              {fetchingOperatorYoutubeId
                ? t("fetchingMyId")
                : t("getMyIdButton")}
            </Button>
          </div>
        )}

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
