"use client";

import { revalidateLogic } from "@tanstack/react-form";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { SystemFeatures } from "@/lib/types/settings";
import type { Space } from "@/lib/types/space";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error-message";
import {
  getOperatorTwitchBroadcasterId,
  getOperatorYouTubeChannelId,
} from "../_actions/get-user-channel";
import type { PublishSpaceState } from "../_actions/settings";
import {
  updateAndPublishSpace,
  updateSpaceSettings,
} from "../_actions/settings";
import {
  spaceSettingsFormOpts,
  spaceSettingsFormSchema,
} from "../_lib/form-options";
import { TwitchBroadcasterIdField } from "./twitch-broadcaster-id-field";
import { YoutubeChannelIdField } from "./youtube-channel-id-field";

interface Props {
  currentParticipantCount: number;
  features: SystemFeatures;
  hasGoogleAuth: boolean;
  hasTwitchAuth: boolean;
  isOwner: boolean;
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
  hasGoogleAuth,
  hasTwitchAuth,
  isOwner,
  locale,
  onSuccess,
  space,
  systemMaxParticipants,
}: Props) {
  const router = useRouter();
  const t = useTranslations("SpaceSettings");
  const [serverError, setServerError] = useState<string | null>(null);

  // 操作者自身のチャンネルID（権限チェック用）
  const [operatorYoutubeChannelId, setOperatorYoutubeChannelId] = useState<
    string | null
  >(null);
  const [operatorTwitchBroadcasterId, setOperatorTwitchBroadcasterId] =
    useState<string | null>(null);
  const [fetchingOperatorYoutubeId, setFetchingOperatorYoutubeId] =
    useState(false);
  const [fetchingOperatorTwitchId, setFetchingOperatorTwitchId] =
    useState(false);

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
      twitch_requirement:
        space.gatekeeper_rules?.twitch?.requirement || "follower",
      youtube_channel_id: space.gatekeeper_rules?.youtube?.channelId || "",
      youtube_requirement:
        space.gatekeeper_rules?.youtube?.requirement || "subscriber",
    },
    transform: useTransform(
      // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
      (baseForm) => mergeForm(baseForm, updateState!),
      [updateState]
    ),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onChange: spaceSettingsFormSchema,
    },
  });

  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  // Get field values directly from form state
  const formValues = useStore(form.store, (state) => state.values);
  const gatekeeperMode =
    (formValues.gatekeeper_mode as "none" | "social" | "email") || "none";
  const socialPlatform =
    (formValues.social_platform as "youtube" | "twitch") || "youtube";
  const youtubeRequirement =
    (formValues.youtube_requirement as string) || "none";
  const twitchRequirement = (formValues.twitch_requirement as string) || "none";

  // 入力されたチャンネルIDと操作者のチャンネルIDを取得
  const enteredYoutubeChannelId =
    (formValues.youtube_channel_id as string) || "";
  const enteredTwitchBroadcasterId =
    (formValues.twitch_broadcaster_id as string) || "";

  // 入力されたIDが操作者自身のものかチェック
  const isYoutubeOwnChannel =
    operatorYoutubeChannelId &&
    enteredYoutubeChannelId &&
    operatorYoutubeChannelId === enteredYoutubeChannelId;
  const isTwitchOwnChannel =
    operatorTwitchBroadcasterId &&
    enteredTwitchBroadcasterId &&
    operatorTwitchBroadcasterId === enteredTwitchBroadcasterId;

  // メンバーシップ/サブスクライバー限定の設定は自分のチャンネルのみ許可
  const canUseYoutubeMemberSubscriber = Boolean(
    !enteredYoutubeChannelId || isYoutubeOwnChannel
  );
  const canUseTwitchSubscriber = Boolean(
    !enteredTwitchBroadcasterId || isTwitchOwnChannel
  );

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
    (features.gatekeeper.youtube.enabled || isYoutubeConfigured) &&
    hasGoogleAuth; // Only show if OAuth is available
  const showTwitchOption =
    (features.gatekeeper.twitch.enabled || isTwitchConfigured) && hasTwitchAuth; // Only show if OAuth is available
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

  // 自動的に操作者のYouTubeチャンネルIDを取得（手動入力時の所有権チェック用）
  const fetchYoutubeOperatorId = useEffectEvent(async (signal: AbortSignal) => {
    setFetchingOperatorYoutubeId(true);
    try {
      const result = await getOperatorYouTubeChannelId();

      // AbortSignalをチェック（コンポーネントがアンマウントされた場合は更新しない）
      if (signal.aborted) {
        return;
      }

      if (result.success && result.channelId) {
        setOperatorYoutubeChannelId(result.channelId);
      }
    } catch (_error) {
      // エラーは無視（所有権チェックができないだけ）
    } finally {
      if (!signal.aborted) {
        setFetchingOperatorYoutubeId(false);
      }
    }
  });

  useEffect(() => {
    // YouTubeチャンネルIDが入力されているが、操作者のIDがまだ取得されていない場合
    if (
      enteredYoutubeChannelId &&
      !operatorYoutubeChannelId &&
      !fetchingOperatorYoutubeId &&
      socialPlatform === "youtube" &&
      gatekeeperMode === "social"
    ) {
      const controller = new AbortController();
      fetchYoutubeOperatorId(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [
    enteredYoutubeChannelId,
    operatorYoutubeChannelId,
    fetchingOperatorYoutubeId,
    socialPlatform,
    gatekeeperMode,
  ]);

  // 自動的に操作者のTwitchブロードキャスターIDを取得（手動入力時の所有権チェック用）
  const fetchTwitchOperatorId = useEffectEvent(async (signal: AbortSignal) => {
    setFetchingOperatorTwitchId(true);
    try {
      const result = await getOperatorTwitchBroadcasterId();

      // AbortSignalをチェック（コンポーネントがアンマウントされた場合は更新しない）
      if (signal.aborted) {
        return;
      }

      if (result.success && result.channelId) {
        setOperatorTwitchBroadcasterId(result.channelId);
      }
    } catch (_error) {
      // エラーは無視（所有権チェックができないだけ）
    } finally {
      if (!signal.aborted) {
        setFetchingOperatorTwitchId(false);
      }
    }
  });

  useEffect(() => {
    // TwitchブロードキャスターIDが入力されているが、操作者のIDがまだ取得されていない場合
    if (
      enteredTwitchBroadcasterId &&
      !operatorTwitchBroadcasterId &&
      !fetchingOperatorTwitchId &&
      socialPlatform === "twitch" &&
      gatekeeperMode === "social"
    ) {
      const controller = new AbortController();
      fetchTwitchOperatorId(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [
    enteredTwitchBroadcasterId,
    operatorTwitchBroadcasterId,
    fetchingOperatorTwitchId,
    socialPlatform,
    gatekeeperMode,
  ]);

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
  const isClosed = space.status === "closed";
  const isPending = isSubmitting || isPublishing;
  const isGatekeeperDisabled = isPending || !isOwner || isClosed;
  const isFormDisabled = isPending || isClosed;

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
      {/* Closed Space Alert */}
      {isClosed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("warning")}</AlertTitle>
          <AlertDescription>{t("errorClosedSpace")}</AlertDescription>
        </Alert>
      )}

      <form
        action={updateAction}
        className="space-y-6"
        noValidate
        onSubmit={() => form.handleSubmit()}
      >
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
                      disabled={isFormDisabled}
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
                      disabled={isFormDisabled}
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
                      disabled={isFormDisabled}
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

          {/* OAuth Warning: Show if social gatekeeper features are enabled but OAuth not linked */}
          {isOwner &&
            !showSocialOption &&
            (features.gatekeeper.youtube.enabled ||
              features.gatekeeper.twitch.enabled) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t.rich("helpOAuthRequired", {
                    accountLink: (chunks) => (
                      <Link
                        className="font-medium underline underline-offset-4"
                        href="/settings/profile"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </AlertDescription>
              </Alert>
            )}

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
                  onValueChange={(value) => {
                    if (!isGatekeeperDisabled) {
                      gatekeeperField.handleChange(
                        value as "none" | "social" | "email"
                      );
                    }
                  }}
                  value={effectiveGatekeeperMode}
                >
                  <TabsList className={cn("grid w-full", gridColsClass)}>
                    <TabsTrigger disabled={isGatekeeperDisabled} value="none">
                      {t("gatekeeperModeNone")}
                    </TabsTrigger>
                    {showSocialOption && (
                      <TabsTrigger
                        disabled={isGatekeeperDisabled}
                        value="social"
                      >
                        {t("gatekeeperModeSocial")}
                      </TabsTrigger>
                    )}
                    {showEmailOption && (
                      <TabsTrigger
                        disabled={isGatekeeperDisabled}
                        value="email"
                      >
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

                            <Field>
                              <FieldContent>
                                <FieldLabel>
                                  {t("socialPlatformLabel")}
                                </FieldLabel>
                                <Combobox
                                  disabled={isGatekeeperDisabled}
                                  emptyText={t("comboboxNoResults")}
                                  onValueChange={(value) =>
                                    platformField.handleChange(
                                      value as "youtube" | "twitch"
                                    )
                                  }
                                  options={[
                                    ...(showYoutubeOption
                                      ? [
                                          {
                                            label: t("platformYoutube"),
                                            value: "youtube",
                                          },
                                        ]
                                      : []),
                                    ...(showTwitchOption
                                      ? [
                                          {
                                            label: t("platformTwitch"),
                                            value: "twitch",
                                          },
                                        ]
                                      : []),
                                  ]}
                                  placeholder={t("socialPlatformLabel")}
                                  searchPlaceholder={t(
                                    "comboboxSearchPlaceholder"
                                  )}
                                  value={effectiveSocialPlatform}
                                />
                              </FieldContent>
                            </Field>
                          </>
                        )}
                      </form.Field>

                      {/* YouTube Settings */}
                      {effectiveSocialPlatform === "youtube" &&
                        showYoutubeOption && (
                          <>
                            <form.Field name="youtube_channel_id">
                              {(field) => (
                                <YoutubeChannelIdField
                                  enteredChannelId={enteredYoutubeChannelId}
                                  field={field}
                                  isPending={isGatekeeperDisabled}
                                  onOperatorIdFetched={
                                    setOperatorYoutubeChannelId
                                  }
                                />
                              )}
                            </form.Field>

                            <form.Field name="youtube_requirement">
                              {(field) => (
                                <Field>
                                  <FieldContent>
                                    <FieldLabel>
                                      {t("youtubeRequirementLabel")}
                                    </FieldLabel>
                                    <RadioGroup
                                      disabled={isGatekeeperDisabled}
                                      name={field.name}
                                      onValueChange={(value) => {
                                        field.handleChange(value);
                                      }}
                                      value={field.state.value as string}
                                    >
                                      {showYoutubeSubscriber && (
                                        <div className="flex items-start space-x-2">
                                          <RadioGroupItem
                                            className="mt-1"
                                            disabled={
                                              !canUseYoutubeMemberSubscriber
                                            }
                                            id="youtube-subscriber"
                                            value="subscriber"
                                          />
                                          <div className="flex-1">
                                            <Label
                                              className="cursor-pointer"
                                              htmlFor="youtube-subscriber"
                                            >
                                              {t("youtubeSubscriber")}
                                            </Label>
                                            <p className="mt-1 text-gray-500 text-sm">
                                              {t(
                                                "youtubeSubscriberDescription"
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      {showYoutubeMember && (
                                        <div className="flex items-start space-x-2">
                                          <RadioGroupItem
                                            className="mt-1"
                                            disabled={
                                              !canUseYoutubeMemberSubscriber
                                            }
                                            id="youtube-member"
                                            value="member"
                                          />
                                          <div className="flex-1">
                                            <Label
                                              className="cursor-pointer"
                                              htmlFor="youtube-member"
                                            >
                                              {t("youtubeMember")}
                                            </Label>
                                            <p className="mt-1 text-gray-500 text-sm">
                                              {t("youtubeMemberDescription")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </RadioGroup>
                                  </FieldContent>
                                </Field>
                              )}
                            </form.Field>
                          </>
                        )}

                      {/* Twitch Settings */}
                      {effectiveSocialPlatform === "twitch" &&
                        showTwitchOption && (
                          <>
                            <form.Field name="twitch_broadcaster_id">
                              {(field) => (
                                <TwitchBroadcasterIdField
                                  canUseSubscriber={canUseTwitchSubscriber}
                                  enteredBroadcasterId={
                                    enteredTwitchBroadcasterId
                                  }
                                  field={field}
                                  isPending={isGatekeeperDisabled}
                                  onOperatorIdFetched={
                                    setOperatorTwitchBroadcasterId
                                  }
                                />
                              )}
                            </form.Field>

                            <form.Field name="twitch_requirement">
                              {(field) => (
                                <Field>
                                  <FieldContent>
                                    <FieldLabel>
                                      {t("twitchRequirementLabel")}
                                    </FieldLabel>
                                    <RadioGroup
                                      disabled={isGatekeeperDisabled}
                                      name={field.name}
                                      onValueChange={(value) => {
                                        field.handleChange(value);
                                      }}
                                      value={field.state.value as string}
                                    >
                                      {showTwitchFollower && (
                                        <div className="flex items-start space-x-2">
                                          <RadioGroupItem
                                            className="mt-1"
                                            id="twitch-follower"
                                            value="follower"
                                          />
                                          <div className="flex-1">
                                            <Label
                                              className="cursor-pointer"
                                              htmlFor="twitch-follower"
                                            >
                                              {t("twitchFollower")}
                                            </Label>
                                            <p className="mt-1 text-gray-500 text-sm">
                                              {t("twitchFollowerDescription")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      {showTwitchSubscriber && (
                                        <div className="flex items-start space-x-2">
                                          <RadioGroupItem
                                            className="mt-1"
                                            disabled={!canUseTwitchSubscriber}
                                            id="twitch-subscriber"
                                            value="subscriber"
                                          />
                                          <div className="flex-1">
                                            <Label
                                              className="cursor-pointer"
                                              htmlFor="twitch-subscriber"
                                            >
                                              {t("twitchSubscriber")}
                                            </Label>
                                            <p className="mt-1 text-gray-500 text-sm">
                                              {t("twitchSubscriberDescription")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </RadioGroup>
                                  </FieldContent>
                                </Field>
                              )}
                            </form.Field>
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
                                disabled={isGatekeeperDisabled}
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
                <Checkbox
                  checked={field.state.value as boolean}
                  className="mt-1"
                  disabled={isFormDisabled}
                  id={field.name}
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
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
          <Button
            disabled={!canSubmit || isPending || isClosed}
            type="submit"
            variant="outline"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("updateButton")}
          </Button>

          {isDraft && (
            <Button
              disabled={!canSubmit || isPending || isClosed}
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
