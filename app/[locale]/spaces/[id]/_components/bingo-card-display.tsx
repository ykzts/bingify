"use client";

import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
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
  const calledNumbers = useMemo(
    () => new Set(calledNumbersArray.map(({ value }) => value)),
    [calledNumbersArray]
  );
  const previousStatusRef = useRef<"none" | "reach" | "bingo">("none");

  // Freeze state when bingo is achieved
  const frozenCalledNumbersRef = useRef<Set<number> | null>(null);
  const frozenBingoLinesRef = useRef<ReturnType<typeof checkBingoLines> | null>(
    null
  );

  // Calculate bingo lines for rendering - use frozen state if bingo has been achieved
  const bingoCheckResult = useMemo(() => {
    if (frozenBingoLinesRef.current) {
      return frozenBingoLinesRef.current;
    }
    return bingoCard
      ? checkBingoLines(bingoCard.numbers, calledNumbers)
      : { hasBingo: false, hasReach: false, bingoLines: [], reachLines: [] };
  }, [bingoCard, calledNumbers]);

  // Use frozen called numbers for display if bingo achieved
  const displayCalledNumbers = frozenCalledNumbersRef.current || calledNumbers;

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

  // Extract confetti animation logic
  const triggerConfetti = useEffectEvent(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0,
    };

    const confettiInterval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(confettiInterval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        particleCount: Math.floor(particleCount),
      });
    }, 250);

    return confettiInterval;
  });

  // Helper to handle game reset
  const handleGameReset = useEffectEvent(() => {
    frozenCalledNumbersRef.current = null;
    frozenBingoLinesRef.current = null;
    previousStatusRef.current = "none";
  });

  // Helper to update bingo status
  const processBingoStatus = useEffectEvent(
    (result: ReturnType<typeof checkBingoLines>) => {
      let newStatus: "none" | "reach" | "bingo" = "none";

      if (result.hasBingo) {
        newStatus = "bingo";
        if (previousStatusRef.current !== "bingo") {
          frozenCalledNumbersRef.current = new Set(calledNumbers);
          frozenBingoLinesRef.current = result;
        }
      } else if (result.hasReach) {
        newStatus = "reach";
      }

      const isTransitionToBingo =
        newStatus === "bingo" && previousStatusRef.current !== "bingo";

      if (newStatus !== previousStatusRef.current) {
        previousStatusRef.current = newStatus;
        updateBingoStatus(spaceId, newStatus).catch((err) => {
          console.error("Failed to update bingo status:", err);
        });
      }

      return isTransitionToBingo;
    }
  );

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

    // Reset frozen state if all numbers cleared (game reset)
    if (calledNumbers.size === 0) {
      if (frozenCalledNumbersRef.current) {
        handleGameReset();
      }
      return;
    }

    const result = checkBingoLines(bingoCard.numbers, calledNumbers);
    const isTransitionToBingo = processBingoStatus(result);

    // Trigger confetti animation on transition to bingo
    if (isTransitionToBingo) {
      const confettiInterval = triggerConfetti();
      return () => {
        clearInterval(confettiInterval);
      };
    }
  }, [bingoCard, calledNumbers]);

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
    // Use frozen state if bingo has been achieved
    if (frozenCalledNumbersRef.current) {
      return frozenCalledNumbersRef.current.has(number);
    }
    return calledNumbers.has(number);
  };

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
          {displayCalledNumbers.size === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              {t("noNumbersCalled")}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from(displayCalledNumbers)
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
