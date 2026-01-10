"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { kickParticipant } from "../_actions/space-operations";
import type { Participant } from "../_hooks/use-participants";
import { useParticipants } from "../_hooks/use-participants";
import { ParticipantsTable } from "./participants-table";

interface Props {
  maxParticipants: number;
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
  t: (key: string, values?: Record<string, string>) => string
): void {
  const displayName =
    participant?.profiles?.full_name || t("participantGuestName");

  if (newStatus === "bingo") {
    toast.success(t("notificationBingo", { name: displayName }), {
      duration: 5000,
    });
  } else if (newStatus === "reach") {
    toast.info(t("notificationReach", { name: displayName }), {
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
    const statusOrder: Record<"bingo" | "reach" | "none", number> = {
      bingo: 0,
      none: 2,
      reach: 1,
    };
    const statusDiff =
      statusOrder[a.bingo_status] - statusOrder[b.bingo_status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const aTime = a.joined_at ? new Date(a.joined_at).getTime() : 0;
    const bTime = b.joined_at ? new Date(b.joined_at).getTime() : 0;
    return aTime - bTime;
  });

  return newList;
}

export function ParticipantsStatus({ spaceId, maxParticipants }: Props) {
  const t = useTranslations("AdminSpace");
  const queryClient = useQueryClient();
  const {
    data: participants = [],
    isPending,
    error,
  } = useParticipants(spaceId);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [isPendingKick, startTransition] = useTransition();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [participantToKick, setParticipantToKick] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  // Use useEffectEvent to separate event logic from effect dependencies
  const onUpdate = useEffectEvent((payload: { new: ParticipantUpdate }) => {
    const updated = payload.new;

    // Validate payload structure
    if (!(updated?.id && updated.user_id && updated.bingo_status)) {
      console.error("Invalid participant update payload:", payload);
      return;
    }

    // Validate bingo_status value
    if (!["none", "reach", "bingo"].includes(updated.bingo_status)) {
      console.error("Invalid bingo_status value:", updated.bingo_status);
      return;
    }

    // Update the participant in the list
    queryClient.setQueryData<Participant[]>(
      ["participants", spaceId],
      (prev) => {
        if (!prev) {
          return [];
        }
        const currentParticipant = prev.find((p) => p.id === updated.id);
        if (currentParticipant) {
          showStatusNotification(currentParticipant, updated.bingo_status, t);
        }
        return updateParticipantList(prev, updated.id, updated.bingo_status);
      }
    );
  });

  const onInsert = useEffectEvent(() => {
    // Refetch participants when a new one joins
    queryClient.invalidateQueries({ queryKey: ["participants", spaceId] });
  });

  const onDelete = useEffectEvent((payload: { old: { id: string } }) => {
    // Validate payload structure
    if (!payload?.old || typeof payload.old.id !== "string") {
      console.warn("Invalid participant delete payload:", payload);
      return;
    }

    const deletedId = payload.old.id;
    queryClient.setQueryData<Participant[]>(
      ["participants", spaceId],
      (prev) => {
        if (!prev) {
          return [];
        }
        return prev.filter((p) => p.id !== deletedId);
      }
    );
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
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
          const updated = payload.new as ParticipantUpdate;
          onUpdate({ new: updated });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "participants",
        },
        () => {
          onInsert();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "participants",
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) {
            onDelete({ old: { id: deletedId } });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId]);

  const handleKickClick = (
    participantId: string,
    participantName: string | null
  ) => {
    setParticipantToKick({ id: participantId, name: participantName });
    setConfirmDialogOpen(true);
  };

  const handleKickConfirm = () => {
    if (!participantToKick) {
      return;
    }

    setKickingId(participantToKick.id);
    setConfirmDialogOpen(false);

    startTransition(async () => {
      const result = await kickParticipant(spaceId, participantToKick.id);
      setKickingId(null);
      setParticipantToKick(null);

      if (result.success) {
        toast.success(t("kickSuccess"));
      } else {
        toast.error(result.error || t("kickError"));
      }
    });
  };

  const handleKickCancel = () => {
    setConfirmDialogOpen(false);
    setParticipantToKick(null);
  };

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("participantsListTitle", { count: 0, max: maxParticipants })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm">
              {t("loadingParticipants")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("participantsListTitle", { count: 0, max: maxParticipants })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive text-sm">
              {t("participantsErrorFetch")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("participantsListTitle", { count: 0, max: maxParticipants })}
          </CardTitle>
          <CardDescription>{t("noParticipants")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const displayNameForDialog =
    participantToKick?.name || t("participantGuestName");

  return (
    <>
      <AlertDialog onOpenChange={setConfirmDialogOpen} open={confirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("kickButton")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("kickConfirm", { name: displayNameForDialog })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKickCancel}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleKickConfirm}>
              {t("kickButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ParticipantsTable
        actions={(participant) => (
          <Button
            disabled={kickingId === participant.id || isPendingKick}
            onClick={() =>
              handleKickClick(
                participant.id,
                participant.profiles?.full_name || null
              )
            }
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t("kickButton")}</span>
          </Button>
        )}
        maxParticipants={maxParticipants}
        participants={participants}
        spaceId={spaceId}
      />
    </>
  );
}
