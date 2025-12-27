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
    const loadCalledNumbers = async () => {
      const numbers = await getCalledNumbers(spaceId);
      setCalledNumbers(numbers);
    };

    loadCalledNumbers();

    const supabase = createClient();
    const channel = supabase
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
          setCalledNumbers((prev) => [...prev, newNumber]);
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

  const calledValues = calledNumbers.map((n) => n.value);

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
            disabled={isCalling || isResetting || calledValues.length >= 75}
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
          {t("calledNumbersCount", { count: calledValues.length, total: 75 })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-medium text-gray-900">{t("calledNumbers")}</h3>
        <div className="grid max-h-96 grid-cols-15 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
          {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
            const isCalled = calledValues.includes(number);
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
