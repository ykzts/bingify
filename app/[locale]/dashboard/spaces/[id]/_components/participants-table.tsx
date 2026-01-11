"use client";

import { PartyPopper, Zap } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
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
import { formatDate } from "@/lib/utils/date-format";
import type { Participant } from "../_hooks/use-participants";
import { ParticipantCardDialog } from "./participant-card-dialog";

interface Props {
  actions?: (participant: Participant) => ReactNode;
  bingoCount?: number;
  emptyMessage?: string;
  maxParticipants?: number;
  participants: Participant[];
  reachCount?: number;
  spaceId: string;
}

const NAME_SPLIT_REGEX = /\s+/;

/**
 * 表示名からイニシャルを取得する
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
  if (!lastPart) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + lastPart[0]).toUpperCase();
}

/**
 * ParticipantsStatus（アクティブスペース）と ClosedSpaceParticipants（クローズド/期限切れスペース）の両方で使用される共有の参加者テーブルコンポーネント
 */
export function ParticipantsTable({
  actions,
  bingoCount: providedBingoCount,
  emptyMessage: providedEmptyMessage,
  maxParticipants,
  participants,
  reachCount: providedReachCount,
  spaceId,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("AdminSpace");

  // Compute counts if not provided
  const bingoCount =
    providedBingoCount ??
    participants.filter((p) => p.bingo_status === "bingo").length;
  const reachCount =
    providedReachCount ??
    participants.filter((p) => p.bingo_status === "reach").length;
  const emptyMessage = providedEmptyMessage ?? t("noParticipants");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {maxParticipants !== undefined
            ? t("participantsListTitle", {
                count: participants.length,
                max: maxParticipants,
              })
            : t("participantsTitle")}
        </CardTitle>
        <CardDescription>
          {maxParticipants !== undefined
            ? t("participantsDescription", {
                count: participants.length,
                max: maxParticipants,
              })
            : t("participantsDescription", {
                count: participants.length,
              })}
          {bingoCount > 0 && (
            <span className="ml-2">
              <PartyPopper className="mr-1 inline size-4" />
              {t("bingoCount", { count: bingoCount })}
            </span>
          )}
          {reachCount > 0 && (
            <span className="ml-2">
              <Zap className="mr-1 inline size-4" />
              {t("reachCount", { count: reachCount })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("participantNameHeader")}</TableHead>
                  <TableHead>{t("participantStatusHeader")}</TableHead>
                  <TableHead>{t("participantJoinedAtHeader")}</TableHead>
                  <TableHead>{t("participantCardHeader")}</TableHead>
                  {actions && (
                    <TableHead>{t("participantActionsHeader")}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => {
                  const displayName =
                    participant?.profiles?.full_name ||
                    t("participantGuestName");
                  const avatarUrl = participant?.profiles?.avatar_url;

                  return (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            {avatarUrl ? (
                              <AvatarImage asChild>
                                <Image
                                  alt={displayName}
                                  className="object-cover"
                                  fill
                                  sizes="32px"
                                  src={avatarUrl}
                                />
                              </AvatarImage>
                            ) : null}
                            <AvatarFallback>
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {participant.bingo_status === "bingo" && (
                          <Badge className="bg-purple-600" variant="default">
                            <PartyPopper className="mr-1 size-3" />
                            {t("statusBadgeBingo")}
                          </Badge>
                        )}
                        {participant.bingo_status === "reach" && (
                          <Badge className="bg-amber-600" variant="default">
                            <Zap className="mr-1 size-3" />
                            {t("statusBadgeReach")}
                          </Badge>
                        )}
                        {participant.bingo_status === "none" && (
                          <Badge variant="secondary">
                            {t("statusBadgeNone")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {participant.joined_at
                          ? formatDate(participant.joined_at, locale)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <ParticipantCardDialog
                          participantId={participant.id}
                          participantName={displayName}
                          spaceId={spaceId}
                        />
                      </TableCell>
                      {actions && <TableCell>{actions(participant)}</TableCell>}
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
