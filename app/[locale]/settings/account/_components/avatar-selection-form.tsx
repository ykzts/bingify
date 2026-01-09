"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { selectAvatar } from "../_actions/avatar";

interface ProviderAvatar {
  avatar_url: string;
  provider: AvatarSource;
}

interface AvatarSelectionFormProps {
  availableAvatars: ProviderAvatar[];
  currentAvatarSource: AvatarSource;
}

export function AvatarSelectionForm({
  availableAvatars,
  currentAvatarSource,
}: AvatarSelectionFormProps) {
  const t = useTranslations("AvatarSettings");
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

  // プロバイダーのラベルを取得
  const getProviderLabel = (provider: AvatarSource): string => {
    switch (provider) {
      case "google":
        return "Google";
      case "twitch":
        return "Twitch";
      case "github":
        return "GitHub";
      case "discord":
        return "Discord";
      case "default":
        return t("defaultAvatar");
      default:
        return provider;
    }
  };

  // アバターアイコンを取得
  const getProviderIcon = (provider: AvatarSource) => {
    switch (provider) {
      case "google":
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <title>Google</title>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        );
      case "twitch":
        return (
          <svg
            className="h-5 w-5 fill-current text-[#9146FF]"
            viewBox="0 0 24 24"
          >
            <title>Twitch</title>
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

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
                    {getProviderIcon(avatar.provider)}
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
