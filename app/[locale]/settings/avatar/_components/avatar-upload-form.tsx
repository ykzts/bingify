"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { ImageCropper } from "@/components/image-cropper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
    };
  }, [previewUrl, imageToCrop]);

  // react-dropzone用のカスタムバリデーター
  const fileValidator = (file: File) => {
    if (file.size < AVATAR_MIN_FILE_SIZE) {
      return {
        code: "file-too-small",
        message: t("errorFileEmpty"),
      };
    }
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      return {
        code: "file-too-large",
        message: t("errorFileSizeExceeded"),
      };
    }
    if (!isValidAvatarMimeType(file.type)) {
      return {
        code: "file-invalid-type",
        message: t("errorInvalidFileType"),
      };
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError(null);

    // 画像URLを生成してクロッパーを表示
    const url = URL.createObjectURL(file);
    setImageToCrop(url);
    setShowCropper(true);
  };

  const handleCropComplete = (croppedFile: File) => {
    setShowCropper(false);

    // 古い画像URLをクリーンアップ
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }

    // クロップされたファイルを選択
    setSelectedFile(croppedFile);

    // 古いプレビューURLをクリーンアップ
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // 新しいプレビュー画像を生成
    const url = URL.createObjectURL(croppedFile);
    setPreviewUrl(url);
  };

  const handleCropCancel = () => {
    setShowCropper(false);

    // 画像URLをクリーンアップ
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
  };

  // react-dropzoneのonDropコールバック
  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // エラーをクリア
    setError(null);

    // ファイルが拒否された場合
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.length > 0) {
        setError(rejection.errors[0].message);
      }
      return;
    }

    // 受け入れられたファイルを処理
    if (acceptedFiles.length > 0) {
      handleFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    disabled: isPending,
    maxFiles: 1,
    multiple: false,
    onDrop,
    validator: fileValidator,
  });

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
      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
          open={showCropper}
        />
      )}

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
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isPending && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className={cn(
                "rounded-full p-3",
                isDragActive ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {isDragActive ? t("dropHere") : t("dragOrClick")}
              </p>
              <p className="text-muted-foreground text-xs">{t("fileHint")}</p>
            </div>
          </div>
        </div>

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
