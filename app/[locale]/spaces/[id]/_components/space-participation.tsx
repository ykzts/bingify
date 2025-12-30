"use client";

import { Loader2, Users, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JoinSpaceState, SpaceInfo } from "../../actions";
import {
  checkUserParticipation,
  getParticipantCount,
  joinSpace,
  leaveSpace,
} from "../../actions";

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
  const buttonClass = compact
    ? "flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const loaderClass = compact ? "h-3 w-3 animate-spin" : "h-4 w-4 animate-spin";

  return (
    <button
      className={buttonClass}
      disabled={isJoining}
      onClick={onClick}
      type="button"
    >
      {isJoining ? (
        <Loader2 className={loaderClass} />
      ) : (
        icon && <span className="flex items-center">{icon}</span>
      )}
      {isJoining ? textLoading : text}
    </button>
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
    <button
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isLeaving}
      onClick={onClick}
      type="button"
    >
      {isLeaving && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLeaving ? textLoading : text}
    </button>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component requires multiple conditional checks for join state, YouTube verification, and participant status
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
  const [participantInfo, setParticipantInfo] = useState<{
    count: number;
    maxParticipants: number;
  } | null>({
    count: 0,
    maxParticipants: spaceInfo.max_participants,
  });
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasYouTubeToken, setHasYouTubeToken] = useState(false);

  // Check if YouTube verification is required
  const requiresYouTube =
    spaceInfo.gatekeeper_rules?.youtube?.channelId &&
    (spaceInfo.gatekeeper_rules.youtube.requirement === "subscriber" ||
      spaceInfo.gatekeeper_rules.youtube.requirement === "member" ||
      spaceInfo.gatekeeper_rules.youtube.required);

  // Load participant info and check if user has joined and has YouTube token
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [info, joined] = await Promise.all([
        getParticipantCount(spaceId),
        checkUserParticipation(spaceId),
      ]);
      setParticipantInfo(info);
      setHasJoined(joined);

      // Check for YouTube token if YouTube verification is required
      if (requiresYouTube && !joined) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setHasYouTubeToken(!!session?.provider_token);
      }

      setIsLoading(false);
    };
    loadInitialData();
  }, [spaceId, requiresYouTube]);

  const refreshParticipantInfo = async () => {
    const info = await getParticipantCount(spaceId);
    setParticipantInfo(info);
  };

  const handleYouTubeVerify = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        options: {
          redirectTo: window.location.href,
          scopes: "https://www.googleapis.com/auth/youtube.readonly",
        },
        provider: "google",
      });

      if (oauthError) {
        console.error("OAuth error:", oauthError);
        setError(t("errorYouTubeVerificationFailed"));
        setIsJoining(false);
      }
      // Note: If successful, user will be redirected, so no need to setIsJoining(false)
    } catch (err) {
      console.error("Error during YouTube verification:", err);
      setError(t("errorYouTubeVerificationFailed"));
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    // Get session with provider tokens
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const result: JoinSpaceState = await joinSpace(
      spaceId,
      session?.provider_token ?? undefined,
      undefined,
      undefined
    );

    if (result.success) {
      setHasJoined(true);
      await refreshParticipantInfo();
      router.refresh();
    } else {
      setError(result.errorKey ? t(result.errorKey) : t("errorJoinFailed"));
    }

    setIsJoining(false);
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    const result: JoinSpaceState = await leaveSpace(spaceId);

    if (result.success) {
      setHasJoined(false);
      await refreshParticipantInfo();
      router.refresh();
    } else {
      setError(result.errorKey ? t(result.errorKey) : t("errorLeaveFailed"));
    }

    setIsLeaving(false);
  };

  if (isLoading) {
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
        {!hasJoined &&
          (requiresYouTube && !hasYouTubeToken ? (
            <JoinButton
              compact
              icon={<Youtube className="h-4 w-4" />}
              isJoining={isJoining}
              onClick={handleYouTubeVerify}
              text={t("verifyAndJoinButton")}
              textLoading={t("verifyingAndJoining")}
            />
          ) : (
            <JoinButton
              compact
              isJoining={isJoining}
              onClick={handleJoin}
              text={t("joinButton")}
              textLoading={t("joining")}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* YouTube Requirement Notice - Only show if token is missing */}
      {requiresYouTube && !hasYouTubeToken && !hasJoined && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm">
            {t("errorYouTubeVerificationRequired")}
          </p>
        </div>
      )}

      {/* Twitch Requirement Notice */}
      {spaceInfo.gatekeeper_rules?.twitch &&
        (spaceInfo.gatekeeper_rules.twitch.requireFollow ||
          spaceInfo.gatekeeper_rules.twitch.requireSub) &&
        !hasJoined && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="text-purple-800 text-sm">
              {t("errorTwitchVerificationRequired")}
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
      {!hasJoined && requiresYouTube && !hasYouTubeToken && (
        <JoinButton
          icon={<Youtube className="h-5 w-5" />}
          isJoining={isJoining}
          onClick={handleYouTubeVerify}
          text={t("verifyAndJoinButton")}
          textLoading={t("verifyingAndJoining")}
        />
      )}
      {!hasJoined && (!requiresYouTube || hasYouTubeToken) && (
        <JoinButton
          isJoining={isJoining}
          onClick={handleJoin}
          text={t("joinButton")}
          textLoading={t("joining")}
        />
      )}
    </div>
  );
}
