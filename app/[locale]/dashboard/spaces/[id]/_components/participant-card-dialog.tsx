"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BingoCard } from "@/components/bingo/bingo-card";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { checkBingoLines } from "@/lib/utils/bingo-checker";
import { getParticipantCard } from "../actions";

interface Props {
  participantName: string | null;
  spaceId: string;
  userId: string;
}

export function ParticipantCardDialog({
  spaceId,
  userId,
  participantName,
}: Props) {
  const t = useTranslations("AdminSpace");
  const tUser = useTranslations("UserSpace");
  const [open, setOpen] = useState(false);

  const { data: cardData, isPending } = useQuery({
    enabled: open,
    queryFn: async () => {
      const result = await getParticipantCard(spaceId, userId);
      if (!(result.success && result.data)) {
        throw new Error(result.error || "Failed to load card");
      }
      return result.data;
    },
    queryKey: ["participant-card", spaceId, userId],
  });

  const { data: calledNumbersArray = [] } = useCalledNumbers(spaceId);
  const calledNumbers = useMemo(
    () => new Set(calledNumbersArray.map(({ value }) => value)),
    [calledNumbersArray]
  );

  const bingoCheckResult = useMemo(() => {
    if (!cardData?.card.numbers) {
      return {
        bingoLines: [],
        hasBingo: false,
        hasReach: false,
        reachLines: [],
      };
    }
    return checkBingoLines(cardData.card.numbers, calledNumbers);
  }, [cardData, calledNumbers]);

  const displayName =
    cardData?.participant.full_name ||
    participantName ||
    t("participantGuestName");

  const reachCount = bingoCheckResult.reachLines.length;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4" />
          <span className="sr-only">{t("viewCardButton")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("participantCardTitle", { name: displayName })}
          </DialogTitle>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground text-sm">
              {t("loadingCard")}
            </div>
          </div>
        )}

        {!isPending && cardData && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {bingoCheckResult.hasBingo && (
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
                  🎉 {tUser("bingo")}
                </Badge>
              )}
              {!bingoCheckResult.hasBingo && bingoCheckResult.hasReach && (
                <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                  ⚡ {t("reachCount", { count: reachCount })}
                </Badge>
              )}
            </div>

            <div className="flex justify-center">
              <BingoCard
                bingoLines={bingoCheckResult.bingoLines}
                calledNumbers={calledNumbers}
                cardNumbers={cardData.card.numbers}
                readonly
              />
            </div>

            <div className="text-center text-muted-foreground text-sm">
              {t("calledNumbersCount", {
                count: calledNumbers.size,
                total: 75,
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
