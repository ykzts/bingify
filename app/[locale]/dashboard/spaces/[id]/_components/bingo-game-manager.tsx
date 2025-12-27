"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CalledNumber } from "../actions";
import { callNumber, getCalledNumbers, resetGame } from "../actions";

interface Props {
  spaceId: string;
}

export function BingoGameManager({ spaceId }: Props) {
  const t = useTranslations("AdminSpace");
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([]);
  const [isCalling, setIsCalling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const numbers = await getCalledNumbers(spaceId);
      if (!isMounted) {
        return;
      }
      setCalledNumbers(numbers);

      channel = supabase
        .channel(`space-${spaceId}-called-numbers`)
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
            if (!isMounted) {
              return;
            }
            setCalledNumbers((prev) => {
              const alreadyExists = prev.some((n) => n.id === newNumber.id);
              return alreadyExists ? prev : [...prev, newNumber];
            });
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
            setCalledNumbers((prev) =>
              prev.filter((n) => n.id !== deletedNumber.id)
            );
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

  const handleCallNumber = async () => {
    setError(null);
    setSuccess(null);
    setIsCalling(true);

    const calledValues = new Set(calledNumbers.map((n) => n.value));
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !calledValues.has(n)
    );

    if (availableNumbers.length === 0) {
      setError(t("allNumbersCalled"));
      setIsCalling(false);
      return;
    }

    const randomNumber =
      availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

    const result = await callNumber(spaceId, randomNumber);

    if (result.success) {
      setSuccess(t("numberCalledSuccess", { number: randomNumber }));
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || t("callNumberError"));
    }

    setIsCalling(false);
  };

  const handleResetGame = async () => {
    // biome-ignore lint/suspicious/noAlert: User confirmation required for destructive action
    if (!confirm(t("resetGameConfirm"))) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsResetting(true);

    const result = await resetGame(spaceId);

    if (result.success) {
      setSuccess(t("resetGameSuccess"));
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || t("resetGameError"));
    }

    setIsResetting(false);
  };

  const calledValuesSet = new Set(calledNumbers.map((n) => n.value));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 font-semibold text-xl">{t("bingoGameManager")}</h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
            {success}
          </div>
        )}

        <div className="mb-4 flex gap-3">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCalling || isResetting || calledValuesSet.size >= 75}
            onClick={handleCallNumber}
            type="button"
          >
            {isCalling ? t("calling") : t("callNumberButton")}
          </button>

          <button
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isResetting || isCalling}
            onClick={handleResetGame}
            type="button"
          >
            <RefreshCw
              className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`}
            />
            {t("resetGameButton")}
          </button>
        </div>

        <div className="text-gray-600 text-sm">
          {t("calledNumbersCount", { count: calledValuesSet.size, total: 75 })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-medium text-gray-900">{t("calledNumbers")}</h3>
        <div className="grid max-h-96 grid-cols-10 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-[repeat(15,minmax(0,1fr))]">
          {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
            const isCalled = calledValuesSet.has(number);
            return (
              <div
                className={`flex aspect-square items-center justify-center rounded font-bold text-sm ${
                  isCalled
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-400"
                }`}
                key={number}
              >
                {number}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
