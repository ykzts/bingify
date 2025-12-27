"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BingoCard } from "../bingo-actions";
import { getOrCreateBingoCard } from "../bingo-actions";

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

export function BingoCardDisplay({ spaceId }: Props) {
  const t = useTranslations("UserSpace");
  const [bingoCard, setBingoCard] = useState<BingoCard | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const supabase = createClient();

    const loadCalledNumbers = async () => {
      const { data } = await supabase
        .from("called_numbers")
        .select("value")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (data) {
        setCalledNumbers(data.map((n) => n.value));
      }
    };

    loadCalledNumbers();

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
          setCalledNumbers((prev) => [...prev, newNumber.value]);
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
        () => {
          setCalledNumbers([]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId]);

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
    return calledNumbers.includes(number);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-center font-bold text-2xl">
          {t("bingoCardTitle")}
        </h2>

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

        <div className="mx-auto mt-2 grid max-w-md grid-cols-5 gap-2">
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
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          scale: [1, 1.1, 1],
                        }
                      : {
                          backgroundColor: "#ffffff",
                          color: "#000000",
                        }
                  }
                  className="flex aspect-square items-center justify-center rounded border-2 font-bold text-xl"
                  key={key}
                  style={{
                    borderColor: isCalled ? "#2563eb" : "#d1d5db",
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isFreeSpace ? t("freeSpace") : number}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-center font-semibold text-lg">
          {t("recentCalledNumbers")}
        </h3>
        <div className="mx-auto max-w-md">
          {calledNumbers.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              {t("noNumbersCalled")}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {calledNumbers.slice(-10).reverse().map((number, index) => (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
                  initial={{ opacity: 0, scale: 0 }}
                  key={`${number}-${calledNumbers.length - index}`}
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
