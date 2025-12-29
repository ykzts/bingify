"use client";

import { Lock, Mail, Twitch, Youtube } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublicSpaceInfo } from "../../actions";

interface Props {
  publicInfo: PublicSpaceInfo;
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
        {publicInfo.description && (
          <p className="text-gray-600 text-lg leading-relaxed">
            {publicInfo.description}
          </p>
        )}
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
              <div className="flex gap-3">
                <Youtube className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {t("youtubeRequirement")}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {publicInfo.gatekeeper_rules.youtube.requirement ===
                    "subscriber"
                      ? t("youtubeSubscriberRequired")
                      : t("youtubeMemberRequired")}
                  </p>
                </div>
              </div>
            )}

            {/* Twitch Requirements */}
            {publicInfo.gatekeeper_rules.twitch && (
              <div className="flex gap-3">
                <Twitch className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {t("twitchRequirement")}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {publicInfo.gatekeeper_rules.twitch.requirement ===
                    "subscriber"
                      ? t("twitchSubscriberRequired")
                      : t("twitchFollowerRequired")}
                  </p>
                </div>
              </div>
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
