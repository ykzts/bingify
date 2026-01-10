"use client";

import { PartyPopper, Trophy, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BingoCard } from "@/components/bingo/bingo-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  BingoCardWithParticipant,
  ParticipantWithProfile,
} from "@/lib/data/participants";
import { checkBingoLines } from "@/lib/utils/bingo-checker";

interface Props {
  bingoCards: BingoCardWithParticipant[];
  calledNumbers: number[];
  participants: ParticipantWithProfile[];
}

/**
 * ビンゴステータスに応じたバッジを表示
 */
function BingoStatusBadge({ status }: { status: string | null }) {
  const t = useTranslations("UserSpace");

  if (status === "bingo") {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600">
        <Trophy aria-hidden="true" className="mr-1 size-3" />
        {t("bingoStatusBingo")}
      </Badge>
    );
  }

  if (status === "reach") {
    return (
      <Badge className="bg-orange-500 hover:bg-orange-600">
        <Zap aria-hidden="true" className="mr-1 size-3" />
        {t("bingoStatusReach")}
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-400" variant="secondary">
      {t("bingoStatusNone")}
    </Badge>
  );
}

/**
 * 終了したスペースの結果を表示するコンポーネント
 */
export function SpaceResults({
  participants,
  bingoCards,
  calledNumbers,
}: Props) {
  const t = useTranslations("UserSpace");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const calledNumbersSet = new Set(calledNumbers);

  const toggleCard = (userId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // ビンゴカードを userId でマップ化
  const cardsMap = new Map(bingoCards.map((card) => [card.user_id, card]));

  return (
    <div className="space-y-8">
      {/* 参加者一覧セクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("participantsTitle")}</span>
            <Badge variant="outline">
              {t("participantsCount", { count: participants.length })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              {t("noParticipants")}
            </p>
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                  key={participant.id}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        alt={participant.full_name || "User"}
                        src={participant.avatar_url || undefined}
                      />
                      <AvatarFallback>
                        {participant.full_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {participant.full_name || "Anonymous User"}
                      </p>
                      {participant.joined_at && (
                        <p className="text-gray-500 text-xs">
                          {t("joinedAt")}:{" "}
                          {new Date(participant.joined_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <BingoStatusBadge status={participant.bingo_status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ビンゴカードセクション */}
      <div className="space-y-4">
        <h3 className="font-semibold text-xl">{t("calledNumbersTitle")}</h3>
        <div className="flex flex-wrap gap-2">
          {calledNumbers.length === 0 ? (
            <p className="text-gray-500 text-sm">{t("noNumbersCalled")}</p>
          ) : (
            calledNumbers.map((number) => (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
                key={number}
              >
                {number}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 各参加者のビンゴカード */}
      <div className="space-y-4">
        <h3 className="font-semibold text-xl">
          {t("participantsTitle")} - {t("bingoCardTitle")}
        </h3>
        <div className="space-y-3">
          {participants.map((participant) => {
            const card = cardsMap.get(participant.user_id);
            if (!card) {
              return null;
            }

            const bingoResult = checkBingoLines(card.numbers, calledNumbersSet);
            const isExpanded = expandedCards.has(participant.user_id);

            return (
              <Collapsible
                key={participant.user_id}
                onOpenChange={() => toggleCard(participant.user_id)}
                open={isExpanded}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        className="w-full justify-between hover:bg-gray-50"
                        variant="ghost"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage
                              alt={participant.full_name || "User"}
                              src={participant.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {participant.full_name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {t("cardFor", {
                              name: participant.full_name || "Anonymous User",
                            })}
                          </span>
                          {bingoResult.hasBingo && (
                            <PartyPopper
                              aria-hidden="true"
                              className="size-5 text-yellow-500"
                            />
                          )}
                        </div>
                        <BingoStatusBadge status={participant.bingo_status} />
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <BingoCard
                        bingoLines={bingoResult.bingoLines}
                        calledNumbers={calledNumbersSet}
                        cardNumbers={card.numbers}
                        readonly
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}
