"use client";

import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef } from "react";
import type { CalledNumber } from "@/hooks/use-called-numbers";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { createClient } from "@/lib/supabase/client";
import { checkBingoLines } from "@/lib/utils/bingo-checker";
import { useBingoCard } from "../_hooks/use-bingo-card";
import { updateBingoStatus } from "../bingo-actions";
import { BingoLineOverlay } from "./bingo-line-overlay";

interface Props {
  spaceId: string;
}

const FREE_SPACE_VALUE = 0;
const BINGO_BLUE = "#2563eb";
const BINGO_WHITE = "#ffffff";
const BINGO_BLACK = "#000000";
const BINGO_BORDER_GRAY = "#d1d5db";

export function BingoCardDisplay({ spaceId }: Props) {
  const t = useTranslations("UserSpace");
  const queryClient = useQueryClient();
  const { data: bingoCard, isPending, error } = useBingoCard(spaceId);
  const { data: calledNumbersArray = [] } = useCalledNumbers(spaceId);
  const calledNumbers = new Set(calledNumbersArray.map(({ value }) => value));
  const previousStatusRef = useRef<"none" | "reach" | "bingo">("none");

  // Use useEffectEvent to separate event logic from effect dependencies
  const onInsert = useEffectEvent((payload: { new: CalledNumber }) => {
    const newNumber = payload.new;
    queryClient.setQueryData<CalledNumber[]>(
      ["called-numbers", spaceId],
      (prev) => {
        if (!prev) {
          return [newNumber];
        }
        const alreadyExists = prev.some((n) => n.id === newNumber.id);
        return alreadyExists ? prev : [...prev, newNumber];
      }
    );
  });

  const onDelete = useEffectEvent((payload: { old: CalledNumber }) => {
    const deletedNumber = payload.old;
    queryClient.setQueryData<CalledNumber[]>(
      ["called-numbers", spaceId],
      (prev) => {
        if (!prev) {
          return [];
        }
        return prev.filter((n) => n.id !== deletedNumber.id);
      }
    );
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`space-${spaceId}-bingo-participant`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "called_numbers",
        },
        (payload) => {
          const newNumber = payload.new as CalledNumber;
          onInsert({ new: newNumber });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "called_numbers",
        },
        (payload) => {
          const deletedNumber = payload.old as CalledNumber;
          onDelete({ old: deletedNumber });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId]);

  // Check bingo status when called numbers or card changes
  useEffect(() => {
    if (!bingoCard) {
      return;
    }

    // Determine new status based on called numbers
    let newStatus: "none" | "reach" | "bingo" = "none";

    if (calledNumbers.size > 0) {
      const result = checkBingoLines(bingoCard.numbers, calledNumbers);

      if (result.hasBingo) {
        newStatus = "bingo";
      } else if (result.hasReach) {
        newStatus = "reach";
      }
    }

    // Only update and trigger effects if status changed
    if (newStatus !== previousStatusRef.current) {
      previousStatusRef.current = newStatus;

      // Update database
      updateBingoStatus(spaceId, newStatus).catch((err) => {
        console.error("Failed to update bingo status:", err);
      });
    }

    // Trigger confetti on bingo
    let confettiInterval: NodeJS.Timeout | null = null;
    if (newStatus === "bingo") {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 0,
      };

      confettiInterval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (confettiInterval) {
            clearInterval(confettiInterval);
          }
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          particleCount: Math.floor(particleCount),
        });
      }, 250);
    }

    // Cleanup interval on unmount
    return () => {
      if (confettiInterval) {
        clearInterval(confettiInterval);
      }
    };
  }, [bingoCard, calledNumbers, spaceId]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t("loading")}</div>
      </div>
    );
  }

  if (error || !bingoCard) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800 text-sm">
          {error instanceof Error ? error.message : t("errorLoadingCard")}
        </p>
      </div>
    );
  }

  const isNumberCalled = (number: number) => {
    if (number === FREE_SPACE_VALUE) {
      return true;
    }
    return calledNumbers.has(number);
  };

  // Calculate bingo lines for rendering
  const bingoCheckResult = bingoCard
    ? checkBingoLines(bingoCard.numbers, calledNumbers)
    : { hasBingo: false, hasReach: false, bingoLines: [], reachLines: [] };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-center font-bold text-2xl">
          {t("bingoCardTitle")}
        </h2>

        {/* Status badges */}
        {bingoCheckResult.hasBingo && (
          <div className="mx-auto mb-4 max-w-md rounded-lg bg-yellow-500 px-4 py-2 text-center font-bold text-lg text-white">
            🎉 {t("bingo")} 🎉
          </div>
        )}
        {!bingoCheckResult.hasBingo && bingoCheckResult.hasReach && (
          <div className="mx-auto mb-4 max-w-md rounded-lg bg-orange-500 px-4 py-2 text-center font-bold text-white">
            ⚡ {t("reach")} ⚡
          </div>
        )}

        <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
          {["B", "I", "N", "G", "O"].map((letter) => (
            <div
              className="flex aspect-square items-center justify-center font-bold text-2xl text-blue-600"
              key={letter}
            >
              {letter}
            </div>
          ))}
        </div>

        <div className="relative mx-auto mt-2 grid max-w-md grid-cols-5 gap-2">
          {bingoCard.numbers.map((row, rowIndex) =>
            row.map((number, colIndex) => {
              const isCalled = isNumberCalled(number);
              const isFreeSpace = number === FREE_SPACE_VALUE;
              const key = `${rowIndex}-${colIndex}`;

              return (
                <motion.div
                  animate={
                    isCalled
                      ? {
                          backgroundColor: BINGO_BLUE,
                          color: BINGO_WHITE,
                          scale: [1, 1.1, 1],
                        }
                      : {
                          backgroundColor: BINGO_WHITE,
                          color: BINGO_BLACK,
                        }
                  }
                  className="flex aspect-square items-center justify-center rounded border-2 font-bold text-xl"
                  key={key}
                  style={{
                    borderColor: isCalled ? BINGO_BLUE : BINGO_BORDER_GRAY,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isFreeSpace ? t("freeSpace") : number}
                </motion.div>
              );
            })
          )}
          {/* Bingo line overlay */}
          <BingoLineOverlay bingoLines={bingoCheckResult.bingoLines} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-center font-semibold text-lg">
          {t("recentCalledNumbers")}
        </h3>
        <div className="mx-auto max-w-md">
          {calledNumbers.size === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              {t("noNumbersCalled")}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from(calledNumbers)
                .slice(-10)
                .reverse()
                .map((number) => (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
                    initial={{ opacity: 0, scale: 0 }}
                    key={number}
                    transition={{ duration: 0.3 }}
                  >
                    {number}
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
