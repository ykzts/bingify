"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getProviderLabel,
  type Provider,
  ProviderIcon,
} from "@/components/providers/provider-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AvatarSource } from "@/lib/services/avatar-service";
import { selectAvatar } from "../_actions/avatar";

interface ProviderAvatar {
  avatar_url: string;
  provider: Provider;
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
