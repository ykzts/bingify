"use client";

import { CheckCircle, Loader2, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SystemFeatures } from "@/lib/types/settings";
import type { PublishSpaceState, UpdateSpaceState } from "../actions";
import { publishSpace, updateSpaceSettings } from "../actions";

interface Space {
  description: string | null;
  gatekeeper_rules: {
    email?: { allowed: string[] };
    twitch?: { broadcasterId: string; requirement: string };
    youtube?: { channelId: string; requirement: string };
  } | null;
  id: string;
  max_participants: number;
  settings?: {
    hide_metadata_before_join?: boolean;
  };
  status: string;
  title: string | null;
}

interface Props {
  currentParticipantCount: number;
  features: SystemFeatures;
  locale: string;
  space: Space;
  systemMaxParticipants: number;
}

// Determine initial gatekeeper mode from existing rules
function determineGatekeeperMode(
  rules: Space["gatekeeper_rules"]
): "none" | "social" | "email" {
  if (!rules) {
    return "none";
  }
  if (rules.email?.allowed && rules.email.allowed.length > 0) {
    return "email";
  }
  if (rules.youtube || rules.twitch) {
    return "social";
  }
  return "none";
}

// Determine initial social platform
// Prefer the platform that has a meaningful (non-"none") requirement.
// If both have equally significant requirements, fall back to YouTube first.
function determineSocialPlatform(
  rules: Space["gatekeeper_rules"]
): "youtube" | "twitch" {
  const youtubeRequirement = rules?.youtube?.requirement;
  const twitchRequirement = rules?.twitch?.requirement;

  const youtubeHasRequirement =
    typeof youtubeRequirement === "string" && youtubeRequirement !== "none";
  const twitchHasRequirement =
    typeof twitchRequirement === "string" && twitchRequirement !== "none";

  // If exactly one platform has a real requirement, choose that one
  if (youtubeHasRequirement && !twitchHasRequirement) {
    return "youtube";
  }
  if (twitchHasRequirement && !youtubeHasRequirement) {
    return "twitch";
  }

  // Tie-breaker: preserve existing YouTube-first behavior when both are present
  if (rules?.youtube) {
    return "youtube";
  }
  if (rules?.twitch) {
    return "twitch";
  }

  // Default when no social rules exist
  return "youtube";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Settings form requires comprehensive state management
export function SpaceSettingsForm({
  currentParticipantCount,
  features,
  locale,
  space,
  systemMaxParticipants,
}: Props) {
  const router = useRouter();
  const t = useTranslations("SpaceSettings");

  const [title, setTitle] = useState(space.title || "");
  const [description, setDescription] = useState(space.description || "");
  const [maxParticipants, setMaxParticipants] = useState(
    space.max_participants
  );

  // Gatekeeper state
  const [gatekeeperMode, setGatekeeperMode] = useState<
    "none" | "social" | "email"
  >(determineGatekeeperMode(space.gatekeeper_rules));
  const [socialPlatform, setSocialPlatform] = useState<"youtube" | "twitch">(
    determineSocialPlatform(space.gatekeeper_rules)
  );

  // YouTube state
  const [youtubeRequirement, setYoutubeRequirement] = useState(
    space.gatekeeper_rules?.youtube?.requirement || "none"
  );
  const [youtubeChannelId, setYoutubeChannelId] = useState(
    space.gatekeeper_rules?.youtube?.channelId || ""
  );

  // Twitch state
  const [twitchRequirement, setTwitchRequirement] = useState(
    space.gatekeeper_rules?.twitch?.requirement || "none"
  );
  const [twitchBroadcasterId, setTwitchBroadcasterId] = useState(
    space.gatekeeper_rules?.twitch?.broadcasterId || ""
  );

  // Email state
  const [emailAllowlist, setEmailAllowlist] = useState(
    space.gatekeeper_rules?.email?.allowed?.join(", ") || ""
  );

  const [hideMetadataBeforeJoin, setHideMetadataBeforeJoin] = useState(
    space.settings?.hide_metadata_before_join ?? false
  );

  const [updateState, updateAction, isUpdating] = useActionState<
    UpdateSpaceState,
    FormData
  >(updateSpaceSettings.bind(null, space.id), {
    success: false,
  });

  const [publishState, publishAction, isPublishing] = useActionState<
    PublishSpaceState,
    FormData
  >(publishSpace.bind(null, space.id), {
    success: false,
  });

  useEffect(() => {
    if (publishState.success) {
      // Redirect to admin page after publishing
      router.push(`/${locale}/dashboard/spaces/${space.id}`);
      router.refresh();
    }
  }, [publishState.success, router, space.id, locale]);

  // Determine visibility of gatekeeper options based on features and existing configuration
  const isEmailConfigured =
    space.gatekeeper_rules?.email?.allowed &&
    space.gatekeeper_rules.email.allowed.length > 0;
  const isYoutubeConfigured =
    space.gatekeeper_rules?.youtube?.requirement &&
    space.gatekeeper_rules.youtube.requirement !== "none";
  const isTwitchConfigured =
    space.gatekeeper_rules?.twitch?.requirement &&
    space.gatekeeper_rules.twitch.requirement !== "none";

  // Show option if: (feature is enabled) OR (feature is disabled BUT already configured)
  const showEmailOption =
    features.gatekeeper.email.enabled || isEmailConfigured;
  const showYoutubeOption =
    features.gatekeeper.youtube.enabled || isYoutubeConfigured;
  const showTwitchOption =
    features.gatekeeper.twitch.enabled || isTwitchConfigured;
  const showSocialOption = showYoutubeOption || showTwitchOption;

  // Auto-switch gatekeeper mode if current mode is not available
  useEffect(() => {
    if (gatekeeperMode === "social" && !showSocialOption) {
      setGatekeeperMode("none");
    } else if (gatekeeperMode === "email" && !showEmailOption) {
      setGatekeeperMode("none");
    }
  }, [gatekeeperMode, showSocialOption, showEmailOption]);

  // Auto-switch social platform if current platform is not available
  useEffect(() => {
    if (socialPlatform === "youtube" && !showYoutubeOption) {
      if (showTwitchOption) {
        setSocialPlatform("twitch");
      }
    } else if (
      socialPlatform === "twitch" &&
      !showTwitchOption &&
      showYoutubeOption
    ) {
      setSocialPlatform("youtube");
    }
  }, [socialPlatform, showYoutubeOption, showTwitchOption]);

  const isDraft = space.status === "draft";
  const isPending = isUpdating || isPublishing;

  // Calculate grid columns for tabs
  const visibleTabCount =
    1 + (showSocialOption ? 1 : 0) + (showEmailOption ? 1 : 0);
  let gridColsClass = "grid-cols-1";
  if (visibleTabCount === 3) {
    gridColsClass = "grid-cols-3";
  } else if (visibleTabCount === 2) {
    gridColsClass = "grid-cols-2";
  }

  return (
    <div className="space-y-8">
      <form action={updateAction} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("basicInfoTitle")}</h2>

          <div>
            <Label className="mb-2" htmlFor="title">
              {t("titleLabel")}
            </Label>
            <Input
              disabled={isPending}
              id="title"
              maxLength={100}
              name="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              type="text"
              value={title}
            />
            {updateState.fieldErrors?.title && (
              <p className="mt-1 text-red-600 text-sm">
                {updateState.fieldErrors.title}
              </p>
            )}
            <p className="mt-1 text-gray-500 text-sm">{t("titleHelp")}</p>
          </div>

          <div>
            <Label className="mb-2" htmlFor="description">
              {t("descriptionLabel")}
            </Label>
            <Textarea
              disabled={isPending}
              id="description"
              maxLength={500}
              name="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              value={description}
            />
            {updateState.fieldErrors?.description && (
              <p className="mt-1 text-red-600 text-sm">
                {updateState.fieldErrors.description}
              </p>
            )}
            <p className="mt-1 text-gray-500 text-sm">{t("descriptionHelp")}</p>
          </div>
        </div>

        {/* Capacity Settings */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("capacityTitle")}</h2>

          <div>
            <Label className="mb-2" htmlFor="max_participants">
              {t("maxParticipantsLabel")}
            </Label>
            <Input
              disabled={isPending}
              id="max_participants"
              max={systemMaxParticipants}
              min={Math.max(1, currentParticipantCount)}
              name="max_participants"
              onChange={(e) => {
                const value = e.target.valueAsNumber;
                setMaxParticipants(Number.isNaN(value) ? 50 : value);
              }}
              required
              type="number"
              value={maxParticipants}
            />
            {updateState.fieldErrors?.max_participants && (
              <p className="mt-1 text-red-600 text-sm">
                {updateState.fieldErrors.max_participants}
              </p>
            )}
            <p className="mt-1 text-gray-500 text-sm">
              {t("maxParticipantsHelp", {
                current: currentParticipantCount,
                max: systemMaxParticipants,
              })}
            </p>
          </div>
        </div>

        {/* Gatekeeper Rules with Tabs */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("gatekeeperTitle")}</h2>

          {/* Hidden input for gatekeeper_mode */}
          <input name="gatekeeper_mode" type="hidden" value={gatekeeperMode} />

          <Tabs
            defaultValue={gatekeeperMode}
            onValueChange={(value) =>
              setGatekeeperMode(value as "none" | "social" | "email")
            }
            value={gatekeeperMode}
          >
            <TabsList className={`grid w-full ${gridColsClass}`}>
              <TabsTrigger value="none">{t("gatekeeperModeNone")}</TabsTrigger>
              {showSocialOption && (
                <TabsTrigger value="social">
                  {t("gatekeeperModeSocial")}
                </TabsTrigger>
              )}
              {showEmailOption && (
                <TabsTrigger value="email">
                  {t("gatekeeperModeEmail")}
                </TabsTrigger>
              )}
            </TabsList>

            {/* None Tab */}
            <TabsContent className="space-y-4" value="none">
              <p className="text-gray-600 text-sm">
                {t("noneModeDescription")}
              </p>
            </TabsContent>

            {/* Social Tab */}
            {showSocialOption && (
              <TabsContent className="space-y-4" value="social">
                <p className="text-gray-600 text-sm">
                  {t("socialModeDescription")}
                </p>

                {/* Hidden input for social_platform */}
                <input
                  name="social_platform"
                  type="hidden"
                  value={socialPlatform}
                />

                <div>
                  <Label className="mb-2">{t("socialPlatformLabel")}</Label>
                  <RadioGroup
                    disabled={isPending}
                    onValueChange={(value) =>
                      setSocialPlatform(value as "youtube" | "twitch")
                    }
                    value={socialPlatform}
                  >
                    {showYoutubeOption && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="platform-youtube" value="youtube" />
                        <Label
                          className="cursor-pointer"
                          htmlFor="platform-youtube"
                        >
                          {t("platformYoutube")}
                        </Label>
                      </div>
                    )}
                    {showTwitchOption && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="platform-twitch" value="twitch" />
                        <Label
                          className="cursor-pointer"
                          htmlFor="platform-twitch"
                        >
                          {t("platformTwitch")}
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* YouTube Settings */}
                {socialPlatform === "youtube" && showYoutubeOption && (
                  <>
                    <div>
                      <Label className="mb-2" htmlFor="youtube_requirement">
                        {t("youtubeRequirementLabel")}
                      </Label>
                      <Select
                        disabled={isPending}
                        name="youtube_requirement"
                        onValueChange={(value) => {
                          setYoutubeRequirement(value);
                          if (value === "none") {
                            setYoutubeChannelId("");
                          }
                        }}
                        value={youtubeRequirement}
                      >
                        <SelectTrigger id="youtube_requirement">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("requirementNone")}
                          </SelectItem>
                          <SelectItem value="subscriber">
                            {t("youtubeSubscriber")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {youtubeRequirement !== "none" && (
                      <div>
                        <Label className="mb-2" htmlFor="youtube_channel_id">
                          {t("youtubeChannelIdLabel")}
                        </Label>
                        <Input
                          disabled={isPending}
                          id="youtube_channel_id"
                          name="youtube_channel_id"
                          onChange={(e) => setYoutubeChannelId(e.target.value)}
                          placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                          required={youtubeRequirement !== "none"}
                          type="text"
                          value={youtubeChannelId}
                        />
                        {updateState.fieldErrors?.youtube_channel_id && (
                          <p className="mt-1 text-red-600 text-sm">
                            {updateState.fieldErrors.youtube_channel_id}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Twitch Settings */}
                {socialPlatform === "twitch" && showTwitchOption && (
                  <>
                    <div>
                      <Label className="mb-2" htmlFor="twitch_requirement">
                        {t("twitchRequirementLabel")}
                      </Label>
                      <Select
                        disabled={isPending}
                        name="twitch_requirement"
                        onValueChange={(value) => {
                          setTwitchRequirement(value);
                          if (value === "none") {
                            setTwitchBroadcasterId("");
                          }
                        }}
                        value={twitchRequirement}
                      >
                        <SelectTrigger id="twitch_requirement">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("requirementNone")}
                          </SelectItem>
                          <SelectItem value="follower">
                            {t("twitchFollower")}
                          </SelectItem>
                          <SelectItem value="subscriber">
                            {t("twitchSubscriber")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {twitchRequirement !== "none" && (
                      <div>
                        <Label className="mb-2" htmlFor="twitch_broadcaster_id">
                          {t("twitchBroadcasterIdLabel")}
                        </Label>
                        <Input
                          disabled={isPending}
                          id="twitch_broadcaster_id"
                          name="twitch_broadcaster_id"
                          onChange={(e) =>
                            setTwitchBroadcasterId(e.target.value)
                          }
                          placeholder="123456789"
                          required={twitchRequirement !== "none"}
                          type="text"
                          value={twitchBroadcasterId}
                        />
                        {updateState.fieldErrors?.twitch_broadcaster_id && (
                          <p className="mt-1 text-red-600 text-sm">
                            {updateState.fieldErrors.twitch_broadcaster_id}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}

            {/* Email Tab */}
            {showEmailOption && (
              <TabsContent className="space-y-4" value="email">
                <p className="text-gray-600 text-sm">
                  {t("emailModeDescription")}
                </p>

                <div>
                  <Label className="mb-2" htmlFor="email_allowlist">
                    {t("emailAllowlistLabel")}
                  </Label>
                  <Textarea
                    disabled={isPending}
                    id="email_allowlist"
                    name="email_allowlist"
                    onChange={(e) => setEmailAllowlist(e.target.value)}
                    placeholder={t("emailAllowlistPlaceholder")}
                    rows={3}
                    value={emailAllowlist}
                  />
                  {updateState.fieldErrors?.email_allowlist && (
                    <p className="mt-1 text-red-600 text-sm">
                      {updateState.fieldErrors.email_allowlist}
                    </p>
                  )}
                  <p className="mt-1 text-gray-500 text-sm">
                    {t("emailAllowlistHelp")}
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Hidden inputs for non-selected modes and platforms */}
          {gatekeeperMode !== "social" && (
            <>
              <input name="youtube_requirement" type="hidden" value="none" />
              <input name="youtube_channel_id" type="hidden" value="" />
              <input name="twitch_requirement" type="hidden" value="none" />
              <input name="twitch_broadcaster_id" type="hidden" value="" />
            </>
          )}
          {gatekeeperMode === "social" && socialPlatform === "twitch" && (
            <>
              <input name="youtube_requirement" type="hidden" value="none" />
              <input name="youtube_channel_id" type="hidden" value="" />
            </>
          )}
          {gatekeeperMode === "social" && socialPlatform === "youtube" && (
            <>
              <input name="twitch_requirement" type="hidden" value="none" />
              <input name="twitch_broadcaster_id" type="hidden" value="" />
            </>
          )}
          {gatekeeperMode !== "email" && (
            <input name="email_allowlist" type="hidden" value="" />
          )}
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("privacyTitle")}</h2>

          <div className="flex items-start gap-3">
            <input
              checked={hideMetadataBeforeJoin}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={isPending}
              id="hide_metadata_before_join"
              name="hide_metadata_before_join"
              onChange={(e) => setHideMetadataBeforeJoin(e.target.checked)}
              type="checkbox"
              value="true"
            />
            <div className="flex-1">
              <Label
                className="cursor-pointer"
                htmlFor="hide_metadata_before_join"
              >
                {t("hideMetadataLabel")}
              </Label>
              <p className="mt-1 text-gray-500 text-sm">
                {t("hideMetadataHelp")}
              </p>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {(updateState.error || publishState.error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">
              {updateState.error || publishState.error}
            </p>
          </div>
        )}

        {/* Success Message for Update */}
        {updateState.success && !publishState.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{t("updateSuccess")}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <Button disabled={isPending} type="submit" variant="outline">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("updateButton")}
          </Button>

          {isDraft && (
            <Button
              disabled={isPending}
              formAction={publishAction}
              type="submit"
            >
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isPublishing && <Rocket className="h-4 w-4" />}
              {t("publishButton")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
