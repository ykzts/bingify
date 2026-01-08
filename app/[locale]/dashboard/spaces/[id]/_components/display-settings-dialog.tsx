"use client";

import { Copy, ExternalLink, Monitor, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateScreenSettings } from "@/lib/actions/screen-settings";
import type {
  BackgroundType,
  DisplayMode,
  LocaleType,
  ThemeType,
} from "@/lib/types/screen-settings";
import { getAbsoluteUrl } from "@/lib/utils/url";
import { regenerateViewToken } from "../../../_actions/space-management";

interface Props {
  initialBackground: BackgroundType;
  initialDisplayMode: DisplayMode;
  initialLocale?: LocaleType;
  initialTheme: ThemeType;
  locale: LocaleType;
  spaceId: string;
  viewToken: string;
}

export function DisplaySettingsDialog({
  initialBackground,
  initialDisplayMode,
  initialLocale,
  initialTheme,
  locale,
  spaceId,
  viewToken,
}: Props) {
  const t = useTranslations("DisplaySettings");
  const tScreen = useTranslations("ScreenView");
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [currentToken, setCurrentToken] = useState(viewToken);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>(initialDisplayMode);
  const [background, setBackground] =
    useState<BackgroundType>(initialBackground);
  const [theme, setTheme] = useState<ThemeType>(initialTheme);
  const [screenLocale, setScreenLocale] = useState<LocaleType>(
    initialLocale || locale
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Build URL without query parameters (settings are now managed via database)
  const viewingUrl = getAbsoluteUrl(`/screen/${currentToken}`);

  // Reset state when initial values change
  useEffect(() => {
    setDisplayMode(initialDisplayMode);
    setBackground(initialBackground);
    setTheme(initialTheme);
    setScreenLocale(initialLocale || locale);
  }, [
    initialDisplayMode,
    initialBackground,
    initialTheme,
    initialLocale,
    locale,
  ]);

  useEffect(() => {
    setCurrentToken(viewToken);
  }, [viewToken]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(viewingUrl);
      toast.success(t("copyUrlSuccess"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("copyUrlError"));
    }
  };

  const handleRegenerateUrl = async () => {
    if (
      !(await confirm({
        description: t("regenerateConfirm"),
        title: t("regenerateUrlButton"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsRegenerating(true);

    try {
      const result = await regenerateViewToken(spaceId);

      if (result.success && result.viewToken) {
        setCurrentToken(result.viewToken);
        toast.success(t("regenerateSuccess"));
      } else {
        toast.error(result.error || t("regenerateError"));
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
      toast.error(t("regenerateError"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenUrl = () => {
    window.open(viewingUrl, "_blank");
  };

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
    const previewUrl = getAbsoluteUrl(`/screen/${currentToken}`);
    window.open(previewUrl, "_blank");
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Monitor className="h-4 w-4" />
          {t("heading")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("heading")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs aria-label={t("heading")} className="w-full" defaultValue="url">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <ExternalLink className="h-4 w-4" />
              {t("urlTab")}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Monitor className="h-4 w-4" />
              {t("settingsTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-6" value="url">
            {/* URL Display and Copy */}
            <div className="space-y-3">
              <Label htmlFor="viewing-url">{t("viewingUrlLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1 font-mono"
                  id="viewing-url"
                  readOnly
                  value={viewingUrl}
                />
                <Button
                  aria-label={t("copyUrlButton")}
                  onClick={handleCopyUrl}
                  size="icon"
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  aria-label={t("openUrlButton")}
                  onClick={handleOpenUrl}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Regenerate URL */}
            <div className="border-t pt-4">
              <Button
                disabled={isRegenerating}
                onClick={handleRegenerateUrl}
                type="button"
                variant="outline"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
                {t("regenerateUrlButton")}
              </Button>
            </div>
          </TabsContent>

          <TabsContent className="space-y-6" value="settings">
            {/* Display Mode */}
            <div className="space-y-2">
              <Label htmlFor="display-mode-select">
                {t("displayModeLabel")}
              </Label>
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
                onValueChange={(value) =>
                  setBackground(value as BackgroundType)
                }
                value={background}
              >
                <SelectTrigger id="background-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {tScreen("bgDefault")}
                  </SelectItem>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
