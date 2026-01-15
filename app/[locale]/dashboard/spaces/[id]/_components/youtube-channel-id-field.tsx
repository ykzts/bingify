"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
import { getOperatorYouTubeChannelId } from "../_actions/get-user-channel";
import { registerYouTubeChannelMetadata } from "../_actions/register-metadata";
import { useYouTubeMetadata } from "../_hooks/use-metadata";

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: FieldApi type requires 23 generic parameters
  field: any;
  isPending: boolean;
  enteredChannelId: string;
  onOperatorIdFetched: (channelId: string) => void;
}

export function YoutubeChannelIdField({
  field,
  isPending,
  enteredChannelId,
  onOperatorIdFetched,
}: Props) {
  const t = useTranslations("SpaceSettings");
  const queryClient = useQueryClient();
  const [youtubeIdError, setYoutubeIdError] = useState<string | null>(null);
  const [fetchingOperatorYoutubeId, setFetchingOperatorYoutubeId] =
    useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: metadata, isLoading: loadingMetadata } =
    useYouTubeMetadata(enteredChannelId);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (metadata && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      handleDelete();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return;
    }
  };

  // Handle delete
  const handleDelete = () => {
    field.handleChange("");
    setYoutubeIdError(null);
  };

  // Format display text for badge
  const getBadgeText = () => {
    if (!metadata) {
      return "";
    }

    const handle = metadata.handle || "";
    const shortId = enteredChannelId.substring(0, 8);

    if (handle) {
      return `@${handle} (${shortId}...)`;
    }
    if (metadata.channel_title) {
      return `${metadata.channel_title} (${shortId}...)`;
    }
    return enteredChannelId;
  };

  const renderInputContent = () => {
    if (loadingMetadata && enteredChannelId) {
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
            value={enteredChannelId || ""}
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
              aria-label={t("removeChannel")}
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
            value={enteredChannelId || ""}
          />
        </InputGroupAddon>
      );
    }
    return (
      <InputGroupInput
        disabled={true}
        name={field.name}
        placeholder={t("youtubeChannelIdPlaceholder")}
        ref={inputRef}
        required={true}
        type="text"
        value=""
      />
    );
  };

  return (
    <Field>
      <FieldContent>
        <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <InputGroup>{renderInputContent()}</InputGroup>
          </div>
          <Button
            disabled={isPending || fetchingOperatorYoutubeId}
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
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("memberSubscriberOnlyOwnChannel")}
          </AlertDescription>
        </Alert>
        <FieldDescription>{t("youtubeChannelIdHelp")}</FieldDescription>
      </FieldContent>
    </Field>
  );
}
