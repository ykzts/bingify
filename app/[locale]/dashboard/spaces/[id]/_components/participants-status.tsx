"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Participant } from "../actions";
import { getParticipants } from "../actions";

interface Props {
  spaceId: string;
}

interface ParticipantUpdate {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  user_id: string;
}

/**
 * Show notification for status change
 */
function showStatusNotification(
  participant: Participant,
  newStatus: "none" | "reach" | "bingo",
  userId: string
): void {
  const displayName =
    participant?.profiles?.display_name || `User ${userId.substring(0, 8)}`;

  if (newStatus === "bingo") {
    toast.success(`🎉 ${displayName} got BINGO!`, {
      duration: 5000,
    });
  } else if (newStatus === "reach") {
    toast.info(`⚡ ${displayName} has REACH!`, {
      duration: 3000,
    });
  }
}

/**
 * Update and sort participant list
 */
function updateParticipantList(
  participants: Participant[],
  updatedId: string,
  newStatus: "none" | "reach" | "bingo"
): Participant[] {
  const index = participants.findIndex((p) => p.id === updatedId);
  if (index === -1) {
    return participants;
  }

  const newList = [...participants];
  newList[index] = {
    ...newList[index],
    bingo_status: newStatus,
  };

  // Sort by bingo status (bingo > reach > none) then by joined_at
  newList.sort((a, b) => {
    const statusOrder = { bingo: 0, reach: 1, none: 2 };
    const statusDiff =
      statusOrder[a.bingo_status] - statusOrder[b.bingo_status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return newList;
}

export function ParticipantsStatus({ spaceId }: Props) {
  const t = useTranslations("AdminSpace");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const data = await getParticipants(spaceId);
      if (!isMounted) {
        return;
      }
      setParticipants(data);
      setIsLoading(false);

      channel = supabase
        .channel(`space-${spaceId}-participants-status`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `space_id=eq.${spaceId}`,
            schema: "public",
            table: "participants",
          },
          (payload) => {
            if (!isMounted) {
              return;
            }

            // Validate payload structure
            const updated = payload.new as ParticipantUpdate;
            if (!(updated?.id && updated.user_id && updated.bingo_status)) {
              console.error("Invalid participant update payload:", payload);
              return;
            }

            // Validate bingo_status value
            if (!["none", "reach", "bingo"].includes(updated.bingo_status)) {
              console.error(
                "Invalid bingo_status value:",
                updated.bingo_status
              );
              return;
            }

            // Update the participant in the list
            setParticipants((prev) => {
              const currentParticipant = prev.find((p) => p.id === updated.id);
              if (currentParticipant) {
                showStatusNotification(
                  currentParticipant,
                  updated.bingo_status,
                  updated.user_id
                );
              }
              return updateParticipantList(
                prev,
                updated.id,
                updated.bingo_status
              );
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [spaceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 text-sm">{t("loadingParticipants")}</div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm">
        {t("noParticipants")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">
        {t("participantsStatus")} ({participants.length})
      </h3>

      <div className="space-y-2">
        {participants.map((participant) => {
          const displayName =
            participant.profiles?.display_name ||
            `User ${participant.user_id.substring(0, 8)}`;

          let statusBadge: React.ReactNode = null;

          if (participant.bingo_status === "bingo") {
            statusBadge = (
              <span className="rounded-full bg-yellow-500 px-3 py-1 font-bold text-sm text-white">
                🎉 BINGO
              </span>
            );
          } else if (participant.bingo_status === "reach") {
            statusBadge = (
              <span className="rounded-full bg-orange-500 px-3 py-1 font-bold text-sm text-white">
                ⚡ REACH
              </span>
            );
          }

          let borderClass = "border-gray-200 bg-white";
          if (participant.bingo_status === "bingo") {
            borderClass = "border-yellow-300 bg-yellow-50";
          } else if (participant.bingo_status === "reach") {
            borderClass = "border-orange-300 bg-orange-50";
          }

          return (
            <div
              className={`flex items-center justify-between rounded-lg border p-3 ${borderClass}`}
              key={participant.id}
            >
              <span className="text-gray-900 text-sm">{displayName}</span>
              {statusBadge}
            </div>
          );
        })}
      </div>
    </div>
  );
}
