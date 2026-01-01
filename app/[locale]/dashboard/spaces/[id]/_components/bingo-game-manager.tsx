"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import type { CalledNumber } from "@/hooks/use-called-numbers";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { createClient } from "@/lib/supabase/client";
import { callNumber, resetGame } from "../actions";

interface Props {
  spaceId: string;
}

export function BingoGameManager({ spaceId }: Props) {
  const t = useTranslations("AdminSpace");
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: calledNumbers = [] } = useCalledNumbers(spaceId);
  const [isCalling, setIsCalling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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

  const handleCallNumber = async () => {
    setIsCalling(true);

    const calledValues = new Set(calledNumbers.map((n) => n.value));
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !calledValues.has(n)
    );

    if (availableNumbers.length === 0) {
      toast.error(t("allNumbersCalled"), {
        duration: 3000,
      });
      setIsCalling(false);
      return;
    }

    const randomNumber =
      availableNumbers[Math.floor(Math.random() * availableNumbers.length)];

    const result = await callNumber(spaceId, randomNumber);

    if (result.success) {
      toast.success(t("numberCalledSuccess", { number: randomNumber }), {
        duration: 3000,
      });

      // Wait for screen animation to complete before allowing next call (1.8 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1800));
    } else {
      toast.error(result.error || t("callNumberError"), {
        duration: 3000,
      });
    }

    setIsCalling(false);
  };

  const handleResetGame = async () => {
    if (
      !(await confirm({
        description: t("resetGameConfirm"),
        title: t("resetGameButton"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsResetting(true);

    const result = await resetGame(spaceId);

    if (result.success) {
      toast.success(t("resetGameSuccess"), {
        duration: 3000,
      });
    } else {
      toast.error(result.error || t("resetGameError"), {
        duration: 3000,
      });
    }

    setIsResetting(false);
  };

  const calledValuesSet = new Set(calledNumbers.map((n) => n.value));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 font-semibold text-xl">{t("bingoGameManager")}</h2>

        <div className="mb-4 flex gap-3">
          <Button
            className="flex-1"
            disabled={isCalling || isResetting || calledValuesSet.size >= 75}
            onClick={handleCallNumber}
            type="button"
          >
            {isCalling ? t("calling") : t("callNumberButton")}
          </Button>

          <Button
            disabled={isResetting || isCalling}
            onClick={handleResetGame}
            type="button"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`}
            />
            {t("resetGameButton")}
          </Button>
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
