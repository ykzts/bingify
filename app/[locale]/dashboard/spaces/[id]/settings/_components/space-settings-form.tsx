"use client";

import { CheckCircle, Loader2, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateSpaceState } from "../actions";
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
  status: string;
  title: string | null;
}

interface Props {
  currentParticipantCount: number;
  locale: string;
  space: Space;
  systemMaxParticipants: number;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Settings form requires comprehensive state management
export function SpaceSettingsForm({
  space,
  currentParticipantCount,
  systemMaxParticipants,
  locale,
}: Props) {
  const router = useRouter();
  const t = useTranslations("SpaceSettings");
  const [title, setTitle] = useState(space.title || "");
  const [description, setDescription] = useState(space.description || "");
  const [maxParticipants, setMaxParticipants] = useState(
    space.max_participants
  );
  const [youtubeRequirement, setYoutubeRequirement] = useState(
    space.gatekeeper_rules?.youtube?.requirement || "none"
  );
  const [youtubeChannelId, setYoutubeChannelId] = useState(
    space.gatekeeper_rules?.youtube?.channelId || ""
  );
  const [twitchRequirement, setTwitchRequirement] = useState(
    space.gatekeeper_rules?.twitch?.requirement || "none"
  );
  const [twitchBroadcasterId, setTwitchBroadcasterId] = useState(
    space.gatekeeper_rules?.twitch?.broadcasterId || ""
  );
  const [emailAllowlist, setEmailAllowlist] = useState(
    space.gatekeeper_rules?.email?.allowed?.join(", ") || ""
  );

  const [updateState, updateAction, isUpdating] = useActionState<
    UpdateSpaceState,
    FormData
  >(updateSpaceSettings.bind(null, space.id), {
    success: false,
  });

  const [publishState, publishAction, isPublishing] = useActionState<
    UpdateSpaceState,
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

  const isDraft = space.status === "draft";
  const isPending = isUpdating || isPublishing;

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
            <p className="mt-1 text-gray-500 text-sm">
              {t("maxParticipantsHelp", {
                current: currentParticipantCount,
                max: systemMaxParticipants,
              })}
            </p>
          </div>
        </div>

        {/* Gatekeeper Rules */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">{t("gatekeeperTitle")}</h2>

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
                <SelectItem value="none">{t("requirementNone")}</SelectItem>
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
            </div>
          )}

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
                <SelectItem value="none">{t("requirementNone")}</SelectItem>
                <SelectItem value="follower">{t("twitchFollower")}</SelectItem>
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
                onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                placeholder="123456789"
                required={twitchRequirement !== "none"}
                type="text"
                value={twitchBroadcasterId}
              />
            </div>
          )}

          <div>
            <Label className="mb-2" htmlFor="email_allowlist">
              {t("emailAllowlistLabel")}
            </Label>
            <Textarea
              disabled={isPending}
              id="email_allowlist"
              name="email_allowlist"
              onChange={(e) => setEmailAllowlist(e.target.value)}
              placeholder="@example.com, user@test.org"
              rows={3}
              value={emailAllowlist}
            />
            <p className="mt-1 text-gray-500 text-sm">
              {t("emailAllowlistHelp")}
            </p>
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
