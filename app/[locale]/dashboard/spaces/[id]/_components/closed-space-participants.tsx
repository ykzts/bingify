"use client";

import { PartyPopper, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useParticipants } from "../_hooks/use-participants";
import { ParticipantCardDialog } from "./participant-card-dialog";

interface Props {
  maxParticipants: number;
  spaceId: string;
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

export function ClosedSpaceParticipants({ spaceId, maxParticipants }: Props) {
  const t = useTranslations("AdminSpace");
  const {
    data: participants = [],
    isPending,
    error,
  } = useParticipants(spaceId);

  const bingoCount = participants.filter(
    (p) => p.bingo_status === "bingo"
  ).length;
  const reachCount = participants.filter(
    (p) => p.bingo_status === "reach"
  ).length;

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("participantsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            {t("errorLoadingParticipants")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("participantsTitle")}</CardTitle>
        <CardDescription>
          {t("participantsCount", {
            count: participants.length.toString(),
            max: maxParticipants.toString(),
          })}
          {bingoCount > 0 &&
            ` • ${t("bingoCount", { count: bingoCount.toString() })}`}
          {reachCount > 0 &&
            ` • ${t("reachCount", { count: reachCount.toString() })}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isPending && participants.length === 0 && (
          <p className="py-8 text-center text-muted-foreground text-sm">
            {t("noParticipantsInClosedSpace")}
          </p>
        )}

        {!isPending && participants.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("participantNameColumn")}</TableHead>
                  <TableHead>{t("participantStatusColumn")}</TableHead>
                  <TableHead className="text-right">
                    {t("participantActionsColumn")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => {
                  const displayName =
                    participant.profiles?.full_name ||
                    t("participantGuestName");
                  const initials = getInitials(participant.profiles?.full_name);

                  return (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              alt={displayName}
                              src={
                                participant.profiles?.avatar_url || undefined
                              }
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {participant.bingo_status === "bingo" && (
                          <Badge className="gap-1" variant="default">
                            <PartyPopper className="h-3 w-3" />
                            {t("statusBingo")}
                          </Badge>
                        )}
                        {participant.bingo_status === "reach" && (
                          <Badge className="gap-1" variant="secondary">
                            <Zap className="h-3 w-3" />
                            {t("statusReach")}
                          </Badge>
                        )}
                        {participant.bingo_status === "none" && (
                          <Badge variant="outline">{t("statusNone")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ParticipantCardDialog
                          userId={participant.user_id}
                          participantName={displayName}
                          spaceId={spaceId}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
