"use client";

import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { JoinSpaceState } from "../../actions";
import {
  checkUserParticipation,
  getParticipantCount,
  joinSpace,
  leaveSpace,
} from "../../actions";

interface SpaceParticipationProps {
  spaceId: string;
}

export function SpaceParticipation({ spaceId }: SpaceParticipationProps) {
  const t = useTranslations("UserSpace");
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantInfo, setParticipantInfo] = useState<{
    count: number;
    maxParticipants: number;
  } | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load participant info and check if user has joined
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const [info, joined] = await Promise.all([
        getParticipantCount(spaceId),
        checkUserParticipation(spaceId),
      ]);
      setParticipantInfo(info);
      setHasJoined(joined);
      setIsLoading(false);
    };
    loadInitialData();
  }, [spaceId]);

  const refreshParticipantInfo = async () => {
    const info = await getParticipantCount(spaceId);
    setParticipantInfo(info);
  };

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    const result: JoinSpaceState = await joinSpace(spaceId);

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      {hasJoined ? (
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLeaving}
          onClick={handleLeave}
          type="button"
        >
          {isLeaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLeaving ? t("leaving") : t("leaveButton")}
        </button>
      ) : (
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isJoining}
          onClick={handleJoin}
          type="button"
        >
          {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
          {isJoining ? t("joining") : t("joinButton")}
        </button>
      )}
    </div>
  );
}
