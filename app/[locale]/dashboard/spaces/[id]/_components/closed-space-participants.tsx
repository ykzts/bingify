"use client";

import { useTranslations } from "next-intl";
import { useParticipants } from "../_hooks/use-participants";
import { ParticipantsTable } from "./participants-table";

interface Props {
  maxParticipants: number;
  spaceId: string;
}

/**
 * Static participant list for closed spaces.
 * No real-time updates, no kick functionality.
 */
export function ClosedSpaceParticipants({ maxParticipants, spaceId }: Props) {
  const t = useTranslations("AdminSpace");
  const { data: participants = [], isLoading } = useParticipants(spaceId);

  // Calculate counts
  const bingoCount = participants.filter(
    (p) => p.bingo_status === "bingo"
  ).length;
  const reachCount = participants.filter(
    (p) => p.bingo_status === "reach"
  ).length;

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  return (
    <ParticipantsTable
      bingoCount={bingoCount}
      emptyMessage={t("noParticipantsInClosedSpace")}
      maxParticipants={maxParticipants}
      participants={participants}
      reachCount={reachCount}
      spaceId={spaceId}
    />
  );
}
