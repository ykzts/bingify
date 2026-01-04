"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { AlertCircle, Loader2, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import { TWITCH_ID_REGEX } from "@/lib/twitch";
import type { SystemFeatures } from "@/lib/types/settings";
import type { Space } from "@/lib/types/space";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  spaceSettingsFormOpts,
  spaceSettingsFormSchema,
} from "../_lib/form-options";
import type { PublishSpaceState } from "../_lib/settings-actions";
import {
  updateAndPublishSpace,
  updateSpaceSettings,
} from "../_lib/settings-actions";

interface Props {
  currentParticipantCount: number;
  features: SystemFeatures;
  locale: string;
  onSuccess?: (message: string) => void;
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
  onSuccess,
  space,
  systemMaxParticipants,
}: Props) {
  const router = useRouter();
  const t = useTranslations("SpaceSettings");
  const [serverError, setServerError] = useState<string | null>(null);
  const [twitchIdConverting, setTwitchIdConverting] = useState(false);
  const [twitchIdError, setTwitchIdError] = useState<string | null>(null);

  // Debounced function to convert Twitch username/URL to ID
  const convertTwitchInput = useDebouncedCallback(
    async (input: string, fieldApi: { setValue: (value: string) => void }) => {
      if (!input || input.trim() === "") {
        setTwitchIdConverting(false);
        setTwitchIdError(null);
        return;
      }

      // If it's already a numeric ID, no conversion needed
      if (TWITCH_ID_REGEX.test(input.trim())) {
        setTwitchIdConverting(false);
        setTwitchIdError(null);
        return;
      }

      setTwitchIdConverting(true);
      setTwitchIdError(null);

      try {
        const response = await fetch("/api/twitch/lookup", {
          body: JSON.stringify({ input: input.trim() }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          setTwitchIdError(data.error || t("twitchBroadcasterIdConvertError"));
          setTwitchIdConverting(false);
          return;
        }

        if (data.broadcasterId) {
          // Update the field value with the converted ID
          fieldApi.setValue(data.broadcasterId);
          setTwitchIdError(null);
        }
      } catch (_error) {
        setTwitchIdError(t("twitchBroadcasterIdConvertError"));
      } finally {
        setTwitchIdConverting(false);
      }
    },
    800
  );

  // Use TanStack Form with Next.js server actions for update
  const [updateState, updateAction] = useActionState(
    updateSpaceSettings.bind(null, space.id),
    initialFormState
  );

  // Separate action state for publish
  const [publishState, publishAction, isPublishing] = useActionState<
    PublishSpaceState,
    FormData
  >(updateAndPublishSpace.bind(null, space.id), {
    success: false,
  });

  const form = useForm({
    ...spaceSettingsFormOpts,
    defaultValues: {
      description: space.description || "",
      email_allowlist: space.gatekeeper_rules?.email?.allowed?.join(", ") || "",
      gatekeeper_mode: determineGatekeeperMode(space.gatekeeper_rules),
      hide_metadata_before_join:
        space.settings?.hide_metadata_before_join ?? false,
      max_participants: space.max_participants,
      social_platform: determineSocialPlatform(space.gatekeeper_rules),
      title: space.title || "",
      twitch_broadcaster_id:
        space.gatekeeper_rules?.twitch?.broadcasterId || "",
      twitch_requirement: space.gatekeeper_rules?.twitch?.requirement || "none",
      youtube_channel_id: space.gatekeeper_rules?.youtube?.channelId || "",
      youtube_requirement:
        space.gatekeeper_rules?.youtube?.requirement || "none",
    },
    validators: {
      onChange: spaceSettingsFormSchema,
    },
    transform: useTransform(
      // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
      (baseForm) => mergeForm(baseForm, updateState!),
      [updateState]
    ),
  });

  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  // Get field values directly from form state
  const formValues = useStore(form.store, (state) => state.values);
  const gatekeeperMode =
    (formValues.gatekeeper_mode as "none" | "social" | "email") || "none";
  const socialPlatform =
    (formValues.social_platform as "youtube" | "twitch") || "youtube";
  const youtubeRequirement =
    (formValues.youtube_requirement as string) || "none";
  const twitchRequirement = (formValues.twitch_requirement as string) || "none";

  // Use useEffectEvent to separate event logic from effect dependencies
  const handleUpdateSuccess = useEffectEvent(() => {
    onSuccess?.(t("updateSuccess"));
    setServerError(null);
  });

  // Common error translation logic
  const translateError = useEffectEvent((error: string): string => {
    // List of known error keys for translation
    const errorKeys = [
      "errorYoutubeDisabled",
      "errorYoutubeMemberDisabled",
      "errorYoutubeSubscriberDisabled",
      "errorTwitchDisabled",
      "errorTwitchFollowerDisabled",
      "errorTwitchSubscriberDisabled",
      "errorEmailDisabled",
    ];
    // Translate error keys, otherwise use the error string as-is
    return errorKeys.includes(error) ? t(error) : error;
  });

  const handleUpdateError = useEffectEvent((error: string) => {
    setServerError(translateError(error));
  });

  const handlePublishSuccess = useEffectEvent(() => {
    router.push(`/${locale}/dashboard/spaces/${space.id}`);
    router.refresh();
  });

  const handlePublishError = useEffectEvent((error: string) => {
    setServerError(translateError(error));
  });

  // Handle update success/error
  useEffect(() => {
    const updateMeta = (updateState as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;

    if (updateMeta?.success) {
      handleUpdateSuccess();
      return;
    }

    const errorMap = (updateState as Record<string, unknown>)?.errorMap;
    if (errorMap && typeof errorMap === "object" && "form" in errorMap) {
      handleUpdateError(String(errorMap.form));
    } else {
      const errors = (updateState as Record<string, unknown>)?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        handleUpdateError(String(errors[0]));
      }
    }
  }, [updateState]);

  // Handle publish success/error and redirect
  useEffect(() => {
    if (publishState.success) {
      handlePublishSuccess();
    }

    if (publishState.error) {
      handlePublishError(publishState.error);
    }
  }, [publishState]);

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

  // Show requirement type options based on system settings
  const showYoutubeMember =
    features.gatekeeper.youtube.enabled &&
    features.gatekeeper.youtube.member.enabled;
  const showYoutubeSubscriber =
    features.gatekeeper.youtube.enabled &&
    features.gatekeeper.youtube.subscriber.enabled;
  const showTwitchFollower =
    features.gatekeeper.twitch.enabled &&
    features.gatekeeper.twitch.follower.enabled;
  const showTwitchSubscriber =
    features.gatekeeper.twitch.enabled &&
    features.gatekeeper.twitch.subscriber.enabled;

  // Check if currently selected requirement is disabled
  const isCurrentRequirementDisabled =
    (gatekeeperMode === "social" &&
      socialPlatform === "youtube" &&
      youtubeRequirement === "member" &&
      !showYoutubeMember) ||
    (gatekeeperMode === "social" &&
      socialPlatform === "youtube" &&
      youtubeRequirement === "subscriber" &&
      !showYoutubeSubscriber) ||
    (gatekeeperMode === "social" &&
      socialPlatform === "twitch" &&
      twitchRequirement === "follower" &&
      !showTwitchFollower) ||
    (gatekeeperMode === "social" &&
      socialPlatform === "twitch" &&
      twitchRequirement === "subscriber" &&
      !showTwitchSubscriber);

  // Use useEffectEvent to separate reset logic from effect dependencies
  const resetRequirementToNone = useEffectEvent(() => {
    if (socialPlatform === "youtube") {
      form.setFieldValue("youtube_requirement", "none");
    } else if (socialPlatform === "twitch") {
      form.setFieldValue("twitch_requirement", "none");
    }
  });

  // Auto-reset to "none" if current requirement is disabled
  useEffect(() => {
    if (isCurrentRequirementDisabled) {
      resetRequirementToNone();
    }
  }, [isCurrentRequirementDisabled]);

  // Calculate effective gatekeeper mode (fallback to "none" if current mode is not available)
  const effectiveGatekeeperMode =
    (gatekeeperMode === "social" && !showSocialOption) ||
    (gatekeeperMode === "email" && !showEmailOption)
      ? "none"
      : gatekeeperMode;

  // Calculate effective social platform (fallback to available option)
  let effectiveSocialPlatform = socialPlatform;
  if (socialPlatform === "youtube" && !showYoutubeOption && showTwitchOption) {
    effectiveSocialPlatform = "twitch";
  } else if (
    socialPlatform === "twitch" &&
    !showTwitchOption &&
    showYoutubeOption
  ) {
    effectiveSocialPlatform = "youtube";
  }

  const isDraft = space.status === "draft";
  const isPending = isSubmitting || isPublishing;

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
        <FieldSet>
          <FieldLegend>{t("basicInfoTitle")}</FieldLegend>
          <FieldGroup>
            <form.Field name="title">
              {(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("titleLabel")}</FieldLabel>
                    <Input
                      disabled={isPending}
                      maxLength={100}
                      name={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("titlePlaceholder")}
                      type="text"
                      value={field.state.value as string}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <FieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </FieldError>
                    )}
                    <FieldDescription>{t("titleHelp")}</FieldDescription>
                  </FieldContent>
                </Field>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("descriptionLabel")}</FieldLabel>
                    <Textarea
                      disabled={isPending}
                      maxLength={500}
                      name={field.name}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
                      value={field.state.value as string}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <FieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </FieldError>
                    )}
                    <FieldDescription>{t("descriptionHelp")}</FieldDescription>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </FieldSet>

        {/* Capacity Settings */}
        <FieldSet>
          <FieldLegend>{t("capacityTitle")}</FieldLegend>
          <FieldGroup>
            <form.Field name="max_participants">
              {(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel>{t("maxParticipantsLabel")}</FieldLabel>
                    <Input
                      disabled={isPending}
                      max={systemMaxParticipants}
                      min={Math.max(1, currentParticipantCount)}
                      name={field.name}
                      onChange={(e) => {
                        const value = e.target.valueAsNumber;
                        field.handleChange(Number.isNaN(value) ? 50 : value);
                      }}
                      required
                      type="number"
                      value={field.state.value as number}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <FieldError>
                        {getErrorMessage(field.state.meta.errors[0])}
                      </FieldError>
                    )}
                    <FieldDescription>
                      {t("maxParticipantsHelp", {
                        current: currentParticipantCount,
                        max: systemMaxParticipants,
                      })}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </FieldSet>

        {/* Gatekeeper Rules with Tabs */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("gatekeeperTitle")}</h2>

          <form.Field name="gatekeeper_mode">
            {(gatekeeperField) => (
              <>
                {/* Hidden input for gatekeeper_mode */}
                <input
                  name={gatekeeperField.name}
                  type="hidden"
                  value={effectiveGatekeeperMode}
                />

                <Tabs
                  defaultValue={effectiveGatekeeperMode}
                  onValueChange={(value) =>
                    gatekeeperField.handleChange(
                      value as "none" | "social" | "email"
                    )
                  }
                  value={effectiveGatekeeperMode}
                >
                  <TabsList className={cn("grid w-full", gridColsClass)}>
                    <TabsTrigger value="none">
                      {t("gatekeeperModeNone")}
                    </TabsTrigger>
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

                      <form.Field name="social_platform">
                        {(platformField) => (
                          <>
                            {/* Hidden input for social_platform */}
                            <input
                              name={platformField.name}
                              type="hidden"
                              value={effectiveSocialPlatform}
                            />

                            <div>
                              <Label className="mb-2">
                                {t("socialPlatformLabel")}
                              </Label>
                              <RadioGroup
                                disabled={isPending}
                                onValueChange={(value) =>
                                  platformField.handleChange(
                                    value as "youtube" | "twitch"
                                  )
                                }
                                value={effectiveSocialPlatform}
                              >
                                {showYoutubeOption && (
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      id="platform-youtube"
                                      value="youtube"
                                    />
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
                                    <RadioGroupItem
                                      id="platform-twitch"
                                      value="twitch"
                                    />
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
                          </>
                        )}
                      </form.Field>

                      {/* YouTube Settings */}
                      {effectiveSocialPlatform === "youtube" &&
                        showYoutubeOption && (
                          <>
                            <form.Field name="youtube_requirement">
                              {(field) => (
                                <Field>
                                  <FieldContent>
                                    <FieldLabel>
                                      {t("youtubeRequirementLabel")}
                                    </FieldLabel>
                                    <Select
                                      disabled={isPending}
                                      name={field.name}
                                      onValueChange={(value) => {
                                        field.handleChange(value);
                                        if (value === "none") {
                                          form.setFieldValue(
                                            "youtube_channel_id",
                                            ""
                                          );
                                        }
                                      }}
                                      value={field.state.value as string}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          {t("requirementNone")}
                                        </SelectItem>
                                        {showYoutubeMember && (
                                          <SelectItem value="member">
                                            {t("youtubeMember")}
                                          </SelectItem>
                                        )}
                                        {showYoutubeSubscriber && (
                                          <SelectItem value="subscriber">
                                            {t("youtubeSubscriber")}
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </FieldContent>
                                </Field>
                              )}
                            </form.Field>

                            {youtubeRequirement !== "none" && (
                              <form.Field name="youtube_channel_id">
                                {(field) => (
                                  <Field>
                                    <FieldContent>
                                      <FieldLabel>
                                        {t("youtubeChannelIdLabel")}
                                      </FieldLabel>
                                      <Input
                                        disabled={isPending}
                                        name={field.name}
                                        onChange={(e) =>
                                          field.handleChange(e.target.value)
                                        }
                                        placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                                        required={youtubeRequirement !== "none"}
                                        type="text"
                                        value={field.state.value as string}
                                      />
                                      {field.state.meta.errors.length > 0 && (
                                        <FieldError>
                                          {getErrorMessage(
                                            field.state.meta.errors[0]
                                          )}
                                        </FieldError>
                                      )}
                                    </FieldContent>
                                  </Field>
                                )}
                              </form.Field>
                            )}
                          </>
                        )}

                      {/* Twitch Settings */}
                      {effectiveSocialPlatform === "twitch" &&
                        showTwitchOption && (
                          <>
                            <form.Field name="twitch_requirement">
                              {(field) => (
                                <Field>
                                  <FieldContent>
                                    <FieldLabel>
                                      {t("twitchRequirementLabel")}
                                    </FieldLabel>
                                    <Select
                                      disabled={isPending}
                                      name={field.name}
                                      onValueChange={(value) => {
                                        field.handleChange(value);
                                        if (value === "none") {
                                          form.setFieldValue(
                                            "twitch_broadcaster_id",
                                            ""
                                          );
                                        }
                                      }}
                                      value={field.state.value as string}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          {t("requirementNone")}
                                        </SelectItem>
                                        {showTwitchFollower && (
                                          <SelectItem value="follower">
                                            {t("twitchFollower")}
                                          </SelectItem>
                                        )}
                                        {showTwitchSubscriber && (
                                          <SelectItem value="subscriber">
                                            {t("twitchSubscriber")}
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </FieldContent>
                                </Field>
                              )}
                            </form.Field>

                            {twitchRequirement !== "none" && (
                              <form.Field name="twitch_broadcaster_id">
                                {(field) => (
                                  <Field>
                                    <FieldContent>
                                      <FieldLabel>
                                        {t("twitchBroadcasterIdLabel")}
                                      </FieldLabel>
                                      <div className="relative">
                                        <Input
                                          disabled={
                                            isPending || twitchIdConverting
                                          }
                                          name={field.name}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            field.handleChange(value);
                                            convertTwitchInput(value, {
                                              setValue: (newValue: string) =>
                                                field.handleChange(newValue),
                                            });
                                          }}
                                          placeholder={t(
                                            "twitchBroadcasterIdPlaceholder"
                                          )}
                                          required={
                                            twitchRequirement !== "none"
                                          }
                                          type="text"
                                          value={field.state.value as string}
                                        />
                                        {twitchIdConverting && (
                                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      {field.state.meta.errors.length > 0 && (
                                        <FieldError>
                                          {getErrorMessage(
                                            field.state.meta.errors[0]
                                          )}
                                        </FieldError>
                                      )}
                                      {twitchIdError && (
                                        <FieldError>{twitchIdError}</FieldError>
                                      )}
                                      <FieldDescription>
                                        {t("twitchBroadcasterIdHelp")}
                                      </FieldDescription>
                                    </FieldContent>
                                  </Field>
                                )}
                              </form.Field>
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

                      <form.Field name="email_allowlist">
                        {(field) => (
                          <Field>
                            <FieldContent>
                              <FieldLabel>
                                {t("emailAllowlistLabel")}
                              </FieldLabel>
                              <Textarea
                                disabled={isPending}
                                name={field.name}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                placeholder={t("emailAllowlistPlaceholder")}
                                rows={3}
                                value={field.state.value as string}
                              />
                              {field.state.meta.errors.length > 0 && (
                                <FieldError>
                                  {getErrorMessage(field.state.meta.errors[0])}
                                </FieldError>
                              )}
                              <FieldDescription>
                                {t("emailAllowlistHelp")}
                              </FieldDescription>
                            </FieldContent>
                          </Field>
                        )}
                      </form.Field>
                    </TabsContent>
                  )}
                </Tabs>
              </>
            )}
          </form.Field>

          {/* Hidden inputs for non-selected modes and platforms */}
          {effectiveGatekeeperMode !== "social" && (
            <>
              <input name="youtube_requirement" type="hidden" value="none" />
              <input name="youtube_channel_id" type="hidden" value="" />
              <input name="twitch_requirement" type="hidden" value="none" />
              <input name="twitch_broadcaster_id" type="hidden" value="" />
            </>
          )}
          {effectiveGatekeeperMode === "social" &&
            effectiveSocialPlatform === "twitch" && (
              <>
                <input name="youtube_requirement" type="hidden" value="none" />
                <input name="youtube_channel_id" type="hidden" value="" />
              </>
            )}
          {effectiveGatekeeperMode === "social" &&
            effectiveSocialPlatform === "youtube" && (
              <>
                <input name="twitch_requirement" type="hidden" value="none" />
                <input name="twitch_broadcaster_id" type="hidden" value="" />
              </>
            )}
          {effectiveGatekeeperMode !== "email" && (
            <input name="email_allowlist" type="hidden" value="" />
          )}
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("privacyTitle")}</h2>

          <form.Field name="hide_metadata_before_join">
            {(field) => (
              <div className="flex items-start gap-3">
                <input
                  checked={field.state.value as boolean}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={isPending}
                  id={field.name}
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
                  value="true"
                />
                <div className="flex-1">
                  <Label className="cursor-pointer" htmlFor={field.name}>
                    {t("hideMetadataLabel")}
                  </Label>
                  <p className="mt-1 text-gray-500 text-sm">
                    {t("hideMetadataHelp")}
                  </p>
                </div>
              </div>
            )}
          </form.Field>
        </div>

        {/* Warning for disabled requirement */}
        {isCurrentRequirementDisabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("warning")}</AlertTitle>
            <AlertDescription>
              {t("warningRequirementDisabled")}
            </AlertDescription>
          </Alert>
        )}

        {/* Server Error Display */}
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("updateError")}</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <Button disabled={isPending} type="submit" variant="outline">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
