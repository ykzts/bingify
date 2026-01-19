"use client";

import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffectEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { JoinSpaceState, SpaceInfo } from "../../_actions/space-join";
import { joinSpace, leaveSpace } from "../../_actions/space-join";
import { useOAuthTokenCheck } from "../_hooks/use-oauth-token-check";
import {
  useParticipantInfo,
  useUserParticipation,
} from "../_hooks/use-participation";
import { useUserNameCheck } from "../_hooks/use-user-name-check";

interface SpaceParticipationProps {
  compact?: boolean;
  spaceId: string;
  spaceInfo: SpaceInfo;
}

interface JoinButtonProps {
  compact?: boolean;
  icon?: React.ReactNode;
  isJoining: boolean;
  onClick: () => void;
  text: string;
  textLoading: string;
}

function JoinButton({
  compact,
  icon,
  isJoining,
  onClick,
  text,
  textLoading,
}: JoinButtonProps) {
  return (
    <Button
      className={compact ? "" : "w-full"}
      disabled={isJoining}
      onClick={onClick}
      type="button"
    >
      {isJoining && (
        <Loader2
          className={compact ? "h-3 w-3 animate-spin" : "h-4 w-4 animate-spin"}
        />
      )}
      {!isJoining && icon && <span className="flex items-center">{icon}</span>}
      {isJoining ? textLoading : text}
    </Button>
  );
}

interface LeaveButtonProps {
  isLeaving: boolean;
  onClick: () => void;
  text: string;
  textLoading: string;
}

function LeaveButton({
  isLeaving,
  onClick,
  text,
  textLoading,
}: LeaveButtonProps) {
  return (
    <Button
      className="w-full"
      disabled={isLeaving}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {isLeaving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLeaving ? textLoading : text}
    </Button>
  );
}

export function SpaceParticipation({
  compact = false,
  spaceId,
  spaceInfo,
}: SpaceParticipationProps) {
  const t = useTranslations("UserSpace");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use queries for participant data
  const {
    data: participantInfo = null,
    isPending: isLoadingInfo,
    refetch: refetchInfo,
  } = useParticipantInfo(spaceId);
  const {
    data: hasJoined = false,
    isPending: isLoadingJoined,
    refetch: refetchJoined,
  } = useUserParticipation(spaceId);

  const isLoading = isLoadingInfo || isLoadingJoined;

  // Check if YouTube verification is required
  const requiresYouTube = useMemo(
    () =>
      spaceInfo.gatekeeper_rules?.youtube?.channelId &&
      (spaceInfo.gatekeeper_rules.youtube.requirement === "subscriber" ||
        spaceInfo.gatekeeper_rules.youtube.requirement === "member"),
    [spaceInfo.gatekeeper_rules]
  );

  // Check if Twitch verification is required
  const requiresTwitch = useMemo(
    () =>
      spaceInfo.gatekeeper_rules?.twitch?.broadcasterId &&
      (spaceInfo.gatekeeper_rules.twitch.requirement === "follower" ||
        spaceInfo.gatekeeper_rules.twitch.requirement === "subscriber"),
    [spaceInfo.gatekeeper_rules]
  );

  // Check OAuth tokens using TanStack Query
  const { data: hasYouTubeToken = null, isPending: isCheckingYouTubeToken } =
    useOAuthTokenCheck("google", Boolean(requiresYouTube && !hasJoined));

  const { data: hasTwitchToken = null, isPending: isCheckingTwitchToken } =
    useOAuthTokenCheck("twitch", Boolean(requiresTwitch && !hasJoined));

  // Check if user has set their name
  const { data: hasUserName = null, isPending: isCheckingUserName } =
    useUserNameCheck(Boolean(!hasJoined));

  const handleJoin = useEffectEvent(async () => {
    setIsJoining(true);
    setError(null);

    const result = await joinSpace(spaceId);

    if (result.success) {
      await Promise.all([refetchJoined(), refetchInfo()]);
      router.refresh();
    } else {
      setError(result.error || t("errorJoinFailed"));
    }

    setIsJoining(false);
  });

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    const result: JoinSpaceState = await leaveSpace(spaceId);

    if (result.success) {
      await Promise.all([refetchJoined(), refetchInfo()]);
      router.refresh();
    } else {
      setError(result.error || t("errorLeaveFailed"));
    }

    setIsLeaving(false);
  };

  // Helper function to render the appropriate join button or account settings link
  const renderJoinButton = (compact?: boolean) => {
    // Check if user has set their name first (highest priority)
    if (hasUserName === false) {
      return (
        <Button
          asChild
          className={compact ? "" : "w-full"}
          type="button"
          variant="outline"
        >
          <Link href="/settings/profile">
            {t("nameSettingRequiredButton")}
          </Link>
        </Button>
      );
    }

    // If YouTube token is required but not available, show link to account settings
    if (requiresYouTube && !hasYouTubeToken) {
      return (
        <Button
          asChild
          className={compact ? "" : "w-full"}
          type="button"
          variant="outline"
        >
          <Link href="/settings/connections">
            {t("youTubeAccountLinkRequiredButton")}
          </Link>
        </Button>
      );
    }

    // If Twitch token is required but not available, show link to account settings
    if (requiresTwitch && !hasTwitchToken) {
      return (
        <Button
          asChild
          className={compact ? "" : "w-full"}
          type="button"
          variant="outline"
        >
          <Link href="/settings/connections">
            {t("twitchAccountLinkRequiredButton")}
          </Link>
        </Button>
      );
    }

    // All requirements met, show normal join button
    return (
      <JoinButton
        compact={compact}
        isJoining={isJoining}
        onClick={handleJoin}
        text={t("joinButton")}
        textLoading={t("joining")}
      />
    );
  };

  if (
    isLoading ||
    isCheckingYouTubeToken ||
    isCheckingTwitchToken ||
    isCheckingUserName
  ) {
    return (
      <div
        className={`flex items-center justify-center ${compact ? "py-2" : "py-8"}`}
      >
        <Loader2
          className={`animate-spin text-gray-400 ${compact ? "h-4 w-4" : "h-6 w-6"}`}
        />
      </div>
    );
  }

  // Compact mode for banner (join button only)
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {error && <p className="text-red-800 text-sm">{error}</p>}
        {!hasJoined && renderJoinButton(true)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Name Requirement Notice - Only show if name is not set */}
      {hasUserName === false && !hasJoined && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-amber-800 text-sm">
            {t("nameSettingRequired")}
          </p>
        </div>
      )}

      {/* YouTube Requirement Notice - Only show if token is missing */}
      {requiresYouTube && hasYouTubeToken === false && !hasJoined && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm">
            {t("youTubeAccountLinkRequired")}
          </p>
        </div>
      )}

      {/* Twitch Requirement Notice - Only show if token is missing */}
      {requiresTwitch && hasTwitchToken === false && !hasJoined && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-purple-800 text-sm">
            {t("twitchAccountLinkRequired")}
          </p>
        </div>
      )}

      {/* Participant Count */}
      {participantInfo && (
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="h-5 w-5" />
          <span>
            {t("participantCount", {
              count: participantInfo.count,
              max: participantInfo.maxParticipants,
            })}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Join/Leave Button */}
      {hasJoined && (
        <LeaveButton
          isLeaving={isLeaving}
          onClick={handleLeave}
          text={t("leaveButton")}
          textLoading={t("leaving")}
        />
      )}
      {!hasJoined && renderJoinButton()}
    </div>
  );
}
