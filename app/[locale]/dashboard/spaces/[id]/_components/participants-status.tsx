"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import type { Participant } from "../actions";
import { getParticipants, kickParticipant } from "../actions";

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
  t: (key: string) => string
): void {
  const displayName =
    participant?.profiles?.full_name || t("participantGuestName");

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
    const statusOrder: Record<"bingo" | "reach" | "none", number> = {
      bingo: 0,
      reach: 1,
      none: 2,
    };
    const statusDiff =
      statusOrder[a.bingo_status] - statusOrder[b.bingo_status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return newList;
}

const NAME_SPLIT_REGEX = /\s+/;

/**
 * Get initials from display name
 */
function getInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "G";
  }

  const parts = trimmed
    .split(NAME_SPLIT_REGEX)
    .filter((part) => part.length > 0);

  if (parts.length === 0 || !parts[0]) {
    return "G";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  const lastPart = parts.at(-1);
  if (!lastPart || lastPart.length === 0) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + lastPart[0]).toUpperCase();
}

export function ParticipantsStatus({ spaceId, maxParticipants }: Props) {
  const t = useTranslations("AdminSpace");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [participantToKick, setParticipantToKick] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const result = await getParticipants(spaceId);
      if (!isMounted) {
        return;
      }
      setParticipants(result.data);
      setError(result.error || null);
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
                  t
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
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `space_id=eq.${spaceId}`,
            schema: "public",
            table: "participants",
          },
          async () => {
            if (!isMounted) {
              return;
            }
            const result = await getParticipants(spaceId);
            if (isMounted) {
              setParticipants(result.data);
              setError(result.error || null);
            }
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
            if (!isMounted) {
              return;
            }

            // Validate payload structure
            if (
              !payload?.old ||
              typeof (payload.old as { id?: string }).id !== "string"
            ) {
              console.warn("Invalid participant delete payload:", payload);
              return;
            }

            const deletedId = (payload.old as { id: string }).id;
            setParticipants((prev) => prev.filter((p) => p.id !== deletedId));
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
  }, [spaceId, t]);

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

  if (isLoading) {
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

      <Card>
        <CardHeader>
          <CardTitle>
            {t("participantsListTitle", {
              count: participants.length,
              max: maxParticipants,
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("participantsTableUser")}</TableHead>
                <TableHead>{t("participantsTableStatus")}</TableHead>
                <TableHead className="text-right">
                  {t("participantsTableActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => {
                const displayName =
                  participant.profiles?.full_name || t("participantGuestName");
                const initials = getInitials(participant.profiles?.full_name);

                return (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {participant.profiles?.avatar_url && (
                            <AvatarImage
                              alt={displayName}
                              src={participant.profiles.avatar_url}
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {displayName}
                          </span>
                          {!participant.profiles?.full_name && (
                            <span className="text-muted-foreground text-xs">
                              {participant.user_id.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {participant.bingo_status === "bingo" && (
                          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                            🎉 BINGO
                          </Badge>
                        )}
                        {participant.bingo_status === "reach" && (
                          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                            ⚡ REACH
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={kickingId === participant.id || isPending}
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
