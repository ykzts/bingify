"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getProviderLabel,
  ProviderIcon,
} from "@/components/providers/provider-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type {
  AvailableAvatar,
  AvatarSource,
} from "@/lib/services/avatar-service";
import { selectAvatar } from "../_actions/avatar";
import { AvatarUploadForm } from "./avatar-upload-form";

interface AvatarSelectionFormProps {
  availableAvatars: AvailableAvatar[];
  currentAvatarSource: AvatarSource;
  uploadedAvatarUrl?: string | null;
}

export function AvatarSelectionForm({
  availableAvatars,
  currentAvatarSource,
  uploadedAvatarUrl,
}: AvatarSelectionFormProps) {
  const t = useTranslations("AvatarSettings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSource, setSelectedSource] =
    useState<AvatarSource>(currentAvatarSource);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await selectAvatar(formData);

      if (result.success) {
        toast.success(t("successAvatarUpdated"));
      } else {
        const errorMessage = result.errorKey
          ? t(result.errorKey as "errorGeneric")
          : t("errorGeneric");
        setError(errorMessage);
      }
    });
  };

  const handleUploadSuccess = () => {
    // アップロード成功時、自動的に "upload" ソースを選択
    setSelectedSource("upload");
    // ページをリフレッシュして最新のアバターを取得
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* アバターアップロードフォーム */}
      <div className="rounded-lg border p-4">
        <AvatarUploadForm onUploadSuccess={handleUploadSuccess} />
      </div>

      <Separator />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <RadioGroup
          className="space-y-3"
          name="source"
          onValueChange={(value) => setSelectedSource(value as AvatarSource)}
          value={selectedSource}
        >
          {/* デフォルトアバター */}
          <div className="flex items-center gap-4 rounded-lg border border-input p-4 transition-colors hover:border-primary">
            <RadioGroupItem id="default" value="default" />
            <Label
              className="flex flex-1 cursor-pointer items-center gap-4"
              htmlFor="default"
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  <span className="text-lg">👤</span>
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{t("defaultAvatar")}</p>
              </div>
            </Label>
          </div>

          {/* アップロードされたアバター */}
          {uploadedAvatarUrl && (
            <div className="flex items-center gap-4 rounded-lg border border-input p-4 transition-colors hover:border-primary">
              <RadioGroupItem id="upload" value="upload" />
              <Label
                className="flex flex-1 cursor-pointer items-center gap-4"
                htmlFor="upload"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    alt={t("uploadedAvatar")}
                    src={uploadedAvatarUrl}
                  />
                  <AvatarFallback>
                    <span className="text-lg">📷</span>
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{t("uploadedAvatar")}</p>
                </div>
              </Label>
            </div>
          )}

          {/* プロバイダーアバター */}
          {availableAvatars.map((avatar) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-input p-4 transition-colors hover:border-primary"
              key={avatar.provider}
            >
              <RadioGroupItem id={avatar.provider} value={avatar.provider} />
              <Label
                className="flex flex-1 cursor-pointer items-center gap-4"
                htmlFor={avatar.provider}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    alt={getProviderLabel(avatar.provider)}
                    src={avatar.avatar_url}
                  />
                  <AvatarFallback>
                    <ProviderIcon provider={avatar.provider} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {getProviderLabel(avatar.provider)}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Button
          disabled={isPending || selectedSource === currentAvatarSource}
          type="submit"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("processing")}
            </>
          ) : (
            t("saveButton")
          )}
        </Button>
      </form>
    </div>
  );
}
