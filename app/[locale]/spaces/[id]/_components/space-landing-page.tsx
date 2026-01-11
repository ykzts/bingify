"use client";

import { Lock, Mail, Twitch, Youtube } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FormattedText } from "@/components/formatted-text";
import type { PublicSpaceInfo } from "@/lib/types/space";

interface Props {
  publicInfo: PublicSpaceInfo;
}

interface YoutubeRequirementProps {
  youtube: NonNullable<
    NonNullable<PublicSpaceInfo["gatekeeper_rules"]>["youtube"]
  >;
}

function YoutubeRequirement({ youtube }: YoutubeRequirementProps) {
  const t = useTranslations("SpaceLanding");

  return (
    <div className="flex gap-3">
      <Youtube className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
      <div className="flex-1 space-y-2">
        <p className="font-medium text-sm">{t("youtubeRequirement")}</p>
        {/* Channel Info */}
        {(youtube.channel_title || youtube.thumbnail_url) && (
          <div className="flex items-center gap-3">
            {youtube.thumbnail_url && (
              <Image
                alt={youtube.channel_title || "YouTube channel avatar"}
                className="h-12 w-12 rounded-full"
                height={48}
                src={youtube.thumbnail_url}
                width={48}
              />
            )}
            <div className="flex-1">
              {youtube.channel_title && (
                <a
                  className="font-medium text-sm hover:underline"
                  href={`https://www.youtube.com/channel/${youtube.channelId}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {youtube.channel_title}
                </a>
              )}
              {youtube.handle && (
                <p className="text-gray-500 text-xs">@{youtube.handle}</p>
              )}
            </div>
          </div>
        )}
        <p className="text-gray-600 text-sm">
          {youtube.requirement === "subscriber"
            ? t("youtubeSubscriberRequired")
            : t("youtubeMemberRequired")}
        </p>
      </div>
    </div>
  );
}

interface TwitchRequirementProps {
  twitch: NonNullable<
    NonNullable<PublicSpaceInfo["gatekeeper_rules"]>["twitch"]
  >;
}

function TwitchRequirement({ twitch }: TwitchRequirementProps) {
  const t = useTranslations("SpaceLanding");

  return (
    <div className="flex gap-3">
      <Twitch className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
      <div className="flex-1 space-y-2">
        <p className="font-medium text-sm">{t("twitchRequirement")}</p>
        {/* Broadcaster Info */}
        {(twitch.display_name || twitch.profile_image_url) && (
          <div className="flex items-center gap-3">
            {twitch.profile_image_url && (
              <Image
                alt={twitch.display_name || "Twitch profile avatar"}
                className="h-12 w-12 rounded-full"
                height={48}
                src={twitch.profile_image_url}
                width={48}
              />
            )}
            <div className="flex-1">
              {twitch.display_name && twitch.username && (
                <a
                  className="font-medium text-sm hover:underline"
                  href={`https://www.twitch.tv/${twitch.username}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {twitch.display_name}
                </a>
              )}
              {twitch.display_name && !twitch.username && (
                <span className="font-medium text-sm">
                  {twitch.display_name}
                </span>
              )}
              {twitch.username && (
                <p className="text-gray-500 text-xs">@{twitch.username}</p>
              )}
            </div>
          </div>
        )}
        <p className="text-gray-600 text-sm">
          {twitch.requirement === "subscriber"
            ? t("twitchSubscriberRequired")
            : t("twitchFollowerRequired")}
        </p>
      </div>
    </div>
  );
}

export function SpaceLandingPage({ publicInfo }: Props) {
  const t = useTranslations("SpaceLanding");

  // If metadata is hidden, show minimal private space message
  if (publicInfo.hideMetadata) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-purple-100 p-6">
              <Lock className="h-12 w-12 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-2xl">{t("privateSpaceTitle")}</h2>
            <p className="text-gray-600">{t("privateSpaceDescription")}</p>
          </div>
          <p className="text-gray-600 text-sm">{t("loginToJoinNote")}</p>
        </div>
      </div>
    );
  }

  // Show full landing page with metadata
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="font-bold text-3xl">
          {publicInfo.title || publicInfo.share_key}
        </h1>
        <FormattedText
          className="text-gray-600 text-lg"
          text={publicInfo.description}
        />
      </div>

      {/* Requirements Section */}
      {publicInfo.gatekeeper_rules && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-semibold text-lg">{t("requirementsTitle")}</h2>
          <div className="space-y-4">
            {/* Email Requirements */}
            {publicInfo.gatekeeper_rules.email?.allowed &&
              publicInfo.gatekeeper_rules.email.allowed.length > 0 && (
                <div className="flex gap-3">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      {t("emailRequirement")}
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-gray-600 text-sm">
                      {publicInfo.gatekeeper_rules.email.allowed.map(
                        (pattern) => (
                          <li className="font-mono" key={pattern}>
                            {pattern}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}

            {/* YouTube Requirements */}
            {publicInfo.gatekeeper_rules.youtube && (
              <YoutubeRequirement
                youtube={publicInfo.gatekeeper_rules.youtube}
              />
            )}

            {/* Twitch Requirements */}
            {publicInfo.gatekeeper_rules.twitch && (
              <TwitchRequirement twitch={publicInfo.gatekeeper_rules.twitch} />
            )}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-blue-800 text-sm">{t("loginNote")}</p>
      </div>
    </div>
  );
}
