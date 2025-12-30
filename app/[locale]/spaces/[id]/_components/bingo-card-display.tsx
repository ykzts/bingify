"use client";

import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkBingoLines } from "@/lib/utils/bingo-checker";
import type { BingoCard } from "../bingo-actions";
import { getOrCreateBingoCard, updateBingoStatus } from "../bingo-actions";
import { BingoLineOverlay } from "./bingo-line-overlay";

interface Props {
  spaceId: string;
}

interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

const FREE_SPACE_VALUE = 0;
const BINGO_BLUE = "#2563eb";
const BINGO_WHITE = "#ffffff";
const BINGO_BLACK = "#000000";
const BINGO_BORDER_GRAY = "#d1d5db";

export function BingoCardDisplay({ spaceId }: Props) {
  const t = useTranslations("UserSpace");
  const [bingoCard, setBingoCard] = useState<BingoCard | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousStatusRef = useRef<"none" | "reach" | "bingo">("none");

  useEffect(() => {
    const loadBingoCard = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getOrCreateBingoCard(spaceId);

      if (result.success && result.card) {
        setBingoCard(result.card);
      } else {
        setError(result.error || t("errorLoadingCard"));
      }

      setIsLoading(false);
    };

    loadBingoCard();
  }, [spaceId, t]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase
        .from("called_numbers")
        .select("value")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (data) {
        setCalledNumbers(new Set(data.map((n) => n.value)));
      }

      channel = supabase
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
            if (!isMounted) {
              return;
            }
            const newNumber = payload.new as CalledNumber;
            setCalledNumbers((prev) => new Set([...prev, newNumber.value]));
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
            if (!isMounted) {
              return;
            }
            const deletedNumber = payload.old as CalledNumber;
            setCalledNumbers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(deletedNumber.value);
              return newSet;
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

  // Check bingo status when called numbers or card changes
  useEffect(() => {
    if (!bingoCard || calledNumbers.size === 0) {
      return;
    }

    const result = checkBingoLines(bingoCard.numbers, calledNumbers);

    let newStatus: "none" | "reach" | "bingo" = "none";
    if (result.hasBingo) {
      newStatus = "bingo";
    } else if (result.hasReach) {
      newStatus = "reach";
    }

    // Only update and trigger effects if status changed
    if (newStatus !== previousStatusRef.current) {
      previousStatusRef.current = newStatus;

      // Update database
      updateBingoStatus(spaceId, newStatus).catch((err) => {
        console.error("Failed to update bingo status:", err);
      });

      // Trigger confetti on bingo
      if (newStatus === "bingo") {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 0,
        };

        const interval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            clearInterval(interval);
            return;
          }

          const particleCount = 50 * (timeLeft / duration);

          confetti({
            ...defaults,
            origin: { x: Math.random(), y: Math.random() - 0.2 },
            particleCount: Math.floor(particleCount),
          });
        }, 250);

        // Cleanup interval on unmount
        return () => {
          clearInterval(interval);
        };
      }
    }
  }, [bingoCard, calledNumbers, spaceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t("loading")}</div>
      </div>
    );
  }

  if (error || !bingoCard) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800 text-sm">{error || t("errorLoadingCard")}</p>
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
            🎉 BINGO! 🎉
          </div>
        )}
        {!bingoCheckResult.hasBingo && bingoCheckResult.hasReach && (
          <div className="mx-auto mb-4 max-w-md rounded-lg bg-orange-500 px-4 py-2 text-center font-bold text-white">
            ⚡ REACH! ⚡
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
