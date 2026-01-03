"use client";

import { ExternalLink, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateScreenSettings } from "@/lib/actions/screen-settings";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";

interface Props {
  initialBackground: BackgroundType;
  initialDisplayMode: DisplayMode;
  initialLocale?: LocaleType;
  initialTheme: ThemeType;
  locale: string;
  spaceId: string;
  viewToken: string;
}

export function ScreenSettingsDialog({
  initialBackground,
  initialDisplayMode,
  initialLocale,
  initialTheme,
  locale,
  spaceId,
  viewToken,
}: Props) {
  const t = useTranslations("ScreenSettings");
  const tScreen = useTranslations("ScreenView");
  const [open, setOpen] = useState(false);
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>(initialDisplayMode);
  const [background, setBackground] =
    useState<BackgroundType>(initialBackground);
  const [theme, setTheme] = useState<ThemeType>(initialTheme);
  const [screenLocale, setScreenLocale] = useState<LocaleType>(
    initialLocale || (locale as LocaleType)
  );
  const [screenLocale, setScreenLocale] = useState<LocaleType>(
    initialLocale || (locale as LocaleType)
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset state when initial values change
  useEffect(() => {
    setDisplayMode(initialDisplayMode);
    setBackground(initialBackground);
    setTheme(initialTheme);
    setScreenLocale(initialLocale || (locale as LocaleType));
  }, [
    initialDisplayMode,
    initialBackground,
    initialTheme,
    initialLocale,
    locale,
  ]);

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      const result = await updateScreenSettings(spaceId, {
        background,
        display_mode: displayMode,
        locale: screenLocale,
        theme,
      });

      if (result.success) {
        toast.success(t("updateSuccess"));
      } else {
        toast.error(result.error || t("errorUpdateFailed"));
      }
    } catch (error) {
      console.error("Failed to update screen settings:", error);
      toast.error(t("errorUpdateFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreview = () => {
    const previewUrl = getAbsoluteUrl(`/screen/${viewToken}`);
    window.open(previewUrl, "_blank");
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Monitor className="h-4 w-4" />
          {t("heading")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("heading")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display Mode */}
          <div className="space-y-2">
            <Label htmlFor="display-mode-select">{t("displayModeLabel")}</Label>
            <Select
              onValueChange={(value) => setDisplayMode(value as DisplayMode)}
              value={displayMode}
            >
              <SelectTrigger id="display-mode-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{tScreen("modeFull")}</SelectItem>
                <SelectItem value="minimal">
                  {tScreen("modeMinimal")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("displayModeDescription")}
            </p>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <Label htmlFor="background-select">{t("backgroundLabel")}</Label>
            <Select
              onValueChange={(value) => setBackground(value as BackgroundType)}
              value={background}
            >
              <SelectTrigger id="background-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{tScreen("bgDefault")}</SelectItem>
                <SelectItem value="transparent">
                  {tScreen("bgTransparent")}
                </SelectItem>
                <SelectItem value="green">{tScreen("bgGreen")}</SelectItem>
                <SelectItem value="blue">{tScreen("bgBlue")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("backgroundDescription")}
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme-select">{t("themeLabel")}</Label>
            <Select
              onValueChange={(value) => setTheme(value as ThemeType)}
              value={theme}
            >
              <SelectTrigger id="theme-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("themeDark")}</SelectItem>
                <SelectItem value="light">{t("themeLight")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("themeDescription")}
            </p>
          </div>

          {/* Locale */}
          <div className="space-y-2">
            <Label htmlFor="locale-select">{t("localeLabel")}</Label>
            <Select
              onValueChange={(value) => setScreenLocale(value as LocaleType)}
              value={screenLocale}
            >
              <SelectTrigger id="locale-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("localeDescription")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={isUpdating}
              onClick={handleUpdate}
              type="button"
            >
              {t("updateButton")}
            </Button>
            <Button onClick={handlePreview} type="button" variant="outline">
              <ExternalLink className="h-4 w-4" />
              {t("previewButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
