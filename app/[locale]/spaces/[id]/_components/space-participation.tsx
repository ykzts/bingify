"use client";

import { Loader2, Users, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  buildOAuthCallbackUrl,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/auth/oauth-utils";
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
      {isJoining && <Loader2 className={loaderClass} />}
      {!isJoining && icon && <span className="flex items-center">{icon}</span>}
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
  const [waitingForOAuth, setWaitingForOAuth] = useState(false);

  // Check if YouTube verification is required
  // This logic matches the server-side verification in actions.ts verifyGatekeeperRules
  const requiresYouTube = useMemo(
    () =>
      spaceInfo.gatekeeper_rules?.youtube?.channelId &&
      (spaceInfo.gatekeeper_rules.youtube.requirement === "subscriber" ||
        spaceInfo.gatekeeper_rules.youtube.requirement === "member" ||
        spaceInfo.gatekeeper_rules.youtube.required),
    [spaceInfo.gatekeeper_rules]
  );

  // Handle visibility change listener cleanup when waiting for OAuth
  useEffect(() => {
    if (!waitingForOAuth) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Give a small delay to allow OAuth redirect to complete if it was successful
        setTimeout(() => {
          // If we're still on this page and haven't redirected, reset the state
          setIsJoining(false);
          setWaitingForOAuth(false);
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: remove the listener when component unmounts or waitingForOAuth changes
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [waitingForOAuth]);

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
      // Note: We cannot reliably determine if session.provider_token belongs to
      // the Google identity, as Supabase's provider_token is always from the most
      // recent OAuth provider and doesn't include metadata about which provider it's from.
      //
      // To prevent OAuth redirect loops, we use sessionStorage to track when OAuth
      // has just completed. If the flag exists, we know the user just authenticated
      // and can proceed with joining.
      if (requiresYouTube && !joined) {
        const youtubeOAuthComplete = sessionStorage.getItem(
          "youtube_oauth_complete"
        );

        if (youtubeOAuthComplete) {
          // User just completed OAuth, clear the flag and set token as valid
          sessionStorage.removeItem("youtube_oauth_complete");
          setHasYouTubeToken(true);
        } else {
          // No OAuth completion detected, require verification
          setHasYouTubeToken(false);
        }
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
      // Set flag in sessionStorage before OAuth redirect
      // This allows us to detect when the user returns from OAuth
      sessionStorage.setItem("youtube_oauth_complete", "true");

      const supabase = createClient();

      // Use linkIdentity to add YouTube scope to existing session
      // This is the correct method for authenticated users requesting additional OAuth scopes
      const { error: oauthError } = await supabase.auth.linkIdentity({
        options: {
          redirectTo: buildOAuthCallbackUrl(window.location.pathname),
          scopes: GOOGLE_OAUTH_SCOPES,
        },
        provider: "google",
      });

      if (oauthError) {
        console.error("OAuth error:", oauthError);
        // Clear the flag if OAuth initiation failed
        sessionStorage.removeItem("youtube_oauth_complete");
        setError(t("errorYouTubeVerificationFailed"));
        setIsJoining(false);
      } else {
        // Set waiting state to trigger the visibility change listener
        // The listener will reset isJoining if the user returns without completing OAuth
        setWaitingForOAuth(true);
      }
    } catch (err) {
      console.error("Error during YouTube verification:", err);
      // Clear the flag if an exception occurred
      sessionStorage.removeItem("youtube_oauth_complete");
      setError(t("errorYouTubeVerificationFailed"));
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    // Get session with provider tokens
    // Note: provider_token will be from the most recent OAuth provider used.
    // For YouTube verification, this will be the Google OAuth token with YouTube scope
    // obtained from handleYouTubeVerify or previous Google authentication.
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Extract Twitch credentials from identities if available
    const twitchIdentity = session?.user?.identities?.find(
      (identity) => identity.provider === "twitch"
    );
    const twitchUserId = twitchIdentity?.id;

    const result: JoinSpaceState = await joinSpace(
      spaceId,
      session?.provider_token ?? undefined,
      session?.provider_token ?? undefined, // Twitch access token (same as provider_token if last auth was Twitch)
      twitchUserId
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

  // Helper function to render the appropriate join button
  const renderJoinButton = (compact?: boolean) => {
    const iconClassName = compact ? "h-4 w-4" : "h-5 w-5";

    if (requiresYouTube && !hasYouTubeToken) {
      return (
        <JoinButton
          compact={compact}
          icon={<Youtube className={iconClassName} />}
          isJoining={isJoining}
          onClick={handleYouTubeVerify}
          text={t("verifyAndJoinButton")}
          textLoading={t("verifyingAndJoining")}
        />
      );
    }
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
        {!hasJoined && renderJoinButton(true)}
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
      {!hasJoined && renderJoinButton()}
    </div>
  );
}
