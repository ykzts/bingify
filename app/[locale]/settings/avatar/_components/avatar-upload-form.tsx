"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVATAR_MAX_FILE_SIZE,
  AVATAR_MIN_FILE_SIZE,
  isValidAvatarMimeType,
} from "@/lib/constants/avatar";
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearFileSelection();
      return;
    }

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
        <div className="space-y-2">
          <Label htmlFor="avatar-file">{t("fileLabel")}</Label>
          <Input
            accept="image/jpeg,image/png,image/webp"
            disabled={isPending}
            id="avatar-file"
            onChange={handleFileChange}
            type="file"
          />
          <p className="text-muted-foreground text-xs">{t("fileHint")}</p>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage alt={t("previewAlt")} src={previewUrl} />
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
