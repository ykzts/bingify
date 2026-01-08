"use client";

import { Loader2, Twitch, Users, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildOAuthCallbackUrl,
  getScopesForProvider,
} from "@/lib/auth/oauth-utils";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { createClient } from "@/lib/supabase/client";
import type { JoinSpaceState, SpaceInfo } from "../../_actions/space-join";
import {
  checkOAuthTokenAvailability,
  joinSpace,
  leaveSpace,
} from "../../_actions/space-join";
import {
  useParticipantInfo,
  useUserParticipation,
} from "../_hooks/use-participation";

// SessionStorage keys for OAuth completion tracking
const YOUTUBE_OAUTH_COMPLETE_KEY = "youtube_oauth_complete";
const TWITCH_OAUTH_COMPLETE_KEY = "twitch_oauth_complete";

interface SpaceParticipationProps {
  compact?: boolean;
  spaceId: string;
  spaceInfo: SpaceInfo;
  systemSettings: SystemSettings;
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
  systemSettings,
}: SpaceParticipationProps) {
  const t = useTranslations("UserSpace");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasYouTubeToken, setHasYouTubeToken] = useState(false);
  const [hasTwitchToken, setHasTwitchToken] = useState(false);
  const [waitingForOAuth, setWaitingForOAuth] = useState(false);
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);

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
  // This logic matches the server-side verification in actions.ts verifyGatekeeperRules
  const requiresYouTube = useMemo(
    () =>
      spaceInfo.gatekeeper_rules?.youtube?.channelId &&
      (spaceInfo.gatekeeper_rules.youtube.requirement === "subscriber" ||
        spaceInfo.gatekeeper_rules.youtube.requirement === "member" ||
        spaceInfo.gatekeeper_rules.youtube.required),
    [spaceInfo.gatekeeper_rules]
  );

  // Check if Twitch verification is required
  // This logic matches the server-side verification in actions.ts verifyGatekeeperRules
  const requiresTwitch = useMemo(
    () =>
      spaceInfo.gatekeeper_rules?.twitch?.broadcasterId &&
      (spaceInfo.gatekeeper_rules.twitch.requirement === "follower" ||
        spaceInfo.gatekeeper_rules.twitch.requirement === "subscriber" ||
        spaceInfo.gatekeeper_rules.twitch.requireFollow ||
        spaceInfo.gatekeeper_rules.twitch.requireSub),
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

  // Use useEffectEvent to check existing OAuth tokens without including all dependencies
  const checkExistingTokens = useEffectEvent(async () => {
    // Check YouTube token if required
    if (requiresYouTube && !hasYouTubeToken) {
      const result = await checkOAuthTokenAvailability("google");
      if (result.available) {
        setHasYouTubeToken(true);
        console.log("既存の有効なYouTubeトークンが見つかりました");
      }
    }

    // Check Twitch token if required
    if (requiresTwitch && !hasTwitchToken) {
      const result = await checkOAuthTokenAvailability("twitch");
      if (result.available) {
        setHasTwitchToken(true);
        console.log("既存の有効なTwitchトークンが見つかりました");
      }
    }
  });

  const handleJoin = useEffectEvent(async () => {
    setIsJoining(true);
    setError(null);

    // トークンはサーバー側でデータベースから取得されるため、
    // ここでは何も渡す必要がない
    const result = await joinSpace(spaceId);

    if (result.success) {
      await Promise.all([refetchJoined(), refetchInfo()]);
      router.refresh();
    } else {
      setError(result.errorKey ? t(result.errorKey) : t("errorJoinFailed"));
    }

    setIsJoining(false);
  });

  // Use useEffectEvent to handle OAuth completion check
  const checkOAuthCompletion = useEffectEvent(async () => {
    let shouldTriggerJoin = false;

    // Check YouTube OAuth completion
    if (sessionStorage.getItem(YOUTUBE_OAUTH_COMPLETE_KEY)) {
      sessionStorage.removeItem(YOUTUBE_OAUTH_COMPLETE_KEY);
      if (requiresYouTube) {
        const result = await checkOAuthTokenAvailability("google");
        if (result.available) {
          setHasYouTubeToken(true);
          shouldTriggerJoin = true;
          console.log("YouTube OAuth完了: トークンを確認しました");
        }
      }
    }

    // Check Twitch OAuth completion
    if (sessionStorage.getItem(TWITCH_OAUTH_COMPLETE_KEY)) {
      sessionStorage.removeItem(TWITCH_OAUTH_COMPLETE_KEY);
      if (requiresTwitch) {
        const result = await checkOAuthTokenAvailability("twitch");
        if (result.available) {
          setHasTwitchToken(true);
          shouldTriggerJoin = true;
          console.log("Twitch OAuth完了: トークンを確認しました");
        }
      }
    }

    if (shouldTriggerJoin) {
      setShouldAutoJoin(true);
    }
  });

  // Check for existing OAuth tokens in database on mount
  useEffect(() => {
    // Only check if user hasn't joined yet
    if (hasJoined) {
      return;
    }

    // First check for OAuth completion flags
    checkOAuthCompletion();

    // Then check for existing tokens
    checkExistingTokens();
  }, [hasJoined]);

  // Auto-join after OAuth completion
  useEffect(() => {
    if (shouldAutoJoin && !hasJoined && !isJoining) {
      setShouldAutoJoin(false);
      handleJoin();
    }
  }, [shouldAutoJoin, hasJoined, isJoining]);

  const handleYouTubeVerify = async () => {
    setIsJoining(true);
    setError(null);

    try {
      // Set flag in sessionStorage before OAuth redirect
      // This allows us to detect when the user returns from OAuth
      sessionStorage.setItem(YOUTUBE_OAUTH_COMPLETE_KEY, "true");

      const supabase = createClient();

      // Use linkIdentity to add YouTube scope to existing session
      // This is the correct method for authenticated users requesting additional OAuth scopes
      const { error: oauthError } = await supabase.auth.linkIdentity({
        options: {
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          redirectTo: buildOAuthCallbackUrl("google", window.location.pathname),
          scopes: getScopesForProvider("google", systemSettings),
        },
        provider: "google",
      });

      if (oauthError) {
        console.error("OAuth error:", oauthError);
        // Clear the flag if OAuth initiation failed
        sessionStorage.removeItem(YOUTUBE_OAUTH_COMPLETE_KEY);
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
      sessionStorage.removeItem(YOUTUBE_OAUTH_COMPLETE_KEY);
      setError(t("errorYouTubeVerificationFailed"));
      setIsJoining(false);
    }
  };

  const handleTwitchVerify = async () => {
    setIsJoining(true);
    setError(null);

    try {
      // Set flag in sessionStorage before OAuth redirect
      // This allows us to detect when the user returns from OAuth
      sessionStorage.setItem(TWITCH_OAUTH_COMPLETE_KEY, "true");

      const supabase = createClient();

      // Use linkIdentity for consistency with YouTube implementation
      // This adds Twitch scope to existing session for authenticated users
      const { error: oauthError } = await supabase.auth.linkIdentity({
        options: {
          redirectTo: buildOAuthCallbackUrl("twitch", window.location.pathname),
          scopes: getScopesForProvider("twitch", systemSettings),
        },
        provider: "twitch",
      });

      if (oauthError) {
        console.error("OAuth error:", oauthError);
        // Clear the flag if OAuth initiation failed
        sessionStorage.removeItem(TWITCH_OAUTH_COMPLETE_KEY);
        setError(t("errorTwitchVerificationFailed"));
        setIsJoining(false);
      } else {
        // Set waiting state to trigger the visibility change listener
        // The listener will reset isJoining if the user returns without completing OAuth
        setWaitingForOAuth(true);
      }
    } catch (err) {
      console.error("Error during Twitch verification:", err);
      // Clear the flag if an exception occurred
      sessionStorage.removeItem(TWITCH_OAUTH_COMPLETE_KEY);
      setError(t("errorTwitchVerificationFailed"));
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    const result: JoinSpaceState = await leaveSpace(spaceId);

    if (result.success) {
      await Promise.all([refetchJoined(), refetchInfo()]);
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

    if (requiresTwitch && !hasTwitchToken) {
      return (
        <JoinButton
          compact={compact}
          icon={<Twitch className={iconClassName} />}
          isJoining={isJoining}
          onClick={handleTwitchVerify}
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

      {/* Twitch Requirement Notice - Only show if token is missing */}
      {requiresTwitch && !hasTwitchToken && !hasJoined && (
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
