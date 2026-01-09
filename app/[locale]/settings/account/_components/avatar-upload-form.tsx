"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // クライアント側バリデーション
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_FILE_SIZE) {
      setError(t("errorFileSizeExceeded"));
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(t("errorInvalidFileType"));
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // プレビュー画像を生成
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
