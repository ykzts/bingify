"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AVATAR_MAX_FILE_SIZE,
  AVATAR_MIN_FILE_SIZE,
  isValidAvatarMimeType,
} from "@/lib/constants/avatar";
import { cn } from "@/lib/utils";
import { uploadAvatarAction } from "../_actions/avatar";

interface AvatarUploadFormProps {
  onUploadSuccess?: () => void;
}

export function AvatarUploadForm({ onUploadSuccess }: AvatarUploadFormProps) {
  const t = useTranslations("AvatarUpload");
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // プレビューURLのクリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearFileSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const validateFile = (file: File): string | null => {
    if (file.size < AVATAR_MIN_FILE_SIZE) {
      return t("errorFileEmpty");
    }
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      return t("errorFileSizeExceeded");
    }
    if (!isValidAvatarMimeType(file.type)) {
      return t("errorInvalidFileType");
    }
    return null;
  };

  const handleFile = (file: File) => {
    // クライアント側バリデーション
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      clearFileSelection();
      return;
    }

    setError(null);
    setSelectedFile(file);

    // 古いプレビューURLをクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // 新しいプレビュー画像を生成
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearFileSelection();
      return;
    }

    handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // ドラッグされているアイテムがファイルかチェック
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // 実際にドロップゾーンから離れた時のみ状態を更新（子要素へのドラッグでチラつき防止）
    if (event.currentTarget === event.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    // 画像ファイルかチェック
    if (!file.type.startsWith("image/")) {
      setError(t("errorInvalidFileType"));
      return;
    }

    handleFile(file);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError(t("errorNoFileSelected"));
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    startTransition(async () => {
      const result = await uploadAvatarAction(formData);

      if (result.success && result.data) {
        toast.success(t("successAvatarUploaded"));
        // 古いプレビューURLをクリーンアップ
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        // コールバックを呼び出し
        onUploadSuccess?.();
      } else {
        const errorMessage = result.errorKey
          ? t(result.errorKey as "errorGeneric")
          : t("errorGeneric");
        setError(errorMessage);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm">{t("title")}</h4>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* ドラッグアンドドロップゾーン */}
        <button
          className={cn(
            "relative w-full cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isPending && "pointer-events-none opacity-50"
          )}
          disabled={isPending}
          onClick={handleDropZoneClick}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          type="button"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className={cn(
                "rounded-full p-3",
                isDragOver ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {isDragOver ? t("dropHere") : t("dragOrClick")}
              </p>
              <p className="text-muted-foreground text-xs">{t("fileHint")}</p>
            </div>
          </div>

          {/* 非表示のファイル入力 */}
          <Input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isPending}
            id="avatar-file"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
        </button>

        {previewUrl && (
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {/* ブロブURLの場合は通常のimgタグを使用 */}
              {previewUrl.startsWith("blob:") ? (
                <AvatarImage alt={t("previewAlt")} src={previewUrl} />
              ) : (
                <AvatarImage asChild src={previewUrl}>
                  <Image
                    alt={t("previewAlt")}
                    className="object-cover"
                    fill
                    sizes="64px"
                    src={previewUrl}
                  />
                </AvatarImage>
              )}
              <AvatarFallback>
                <Upload className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{t("previewLabel")}</p>
              <p className="text-muted-foreground text-xs">
                {selectedFile?.name}
              </p>
            </div>
          </div>
        )}

        <Button disabled={isPending || !selectedFile} type="submit">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("uploading")}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t("uploadButton")}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
