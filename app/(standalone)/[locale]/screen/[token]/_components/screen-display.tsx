"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CalledNumber } from "@/hooks/use-called-numbers";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { useDrumRoll } from "@/hooks/use-drum-roll";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useBackground } from "../../_context/background-context";

interface Props {
  baseUrl: string;
  initialBg?: string;
  initialMode?: string;
  locale: string;
  shareKey: string;
  spaceId: string;
}

type DisplayMode = "full" | "minimal";
type BackgroundType = "default" | "transparent" | "green" | "blue";

// Validation helpers
function normalizeDisplayMode(value?: string): DisplayMode {
  if (value === "full" || value === "minimal") {
    return value;
  }
  return "full";
}

function normalizeBackgroundType(value?: string): BackgroundType {
  if (
    value === "default" ||
    value === "transparent" ||
    value === "green" ||
    value === "blue"
  ) {
    return value;
  }
  return "default";
}

export function ScreenDisplay({
  baseUrl,
  initialBg = "default",
  initialMode = "full",
  locale,
  shareKey,
  spaceId,
}: Props) {
  const t = useTranslations("ScreenView");
  const queryClient = useQueryClient();
  const { data: calledNumbers = [] } = useCalledNumbers(spaceId, { retry: 3 });
  const [mode, setMode] = useState<DisplayMode>(
    normalizeDisplayMode(initialMode)
  );
  const [showSettings, setShowSettings] = useState(false);
  const {
    currentNumber: drumRollNumber,
    isAnimating,
    startDrumRoll,
  } = useDrumRoll({
    duration: 1800, // 1.8 seconds
  });

  // Use background context instead of local state
  const { background, setBackground } = useBackground();

  // Initialize background from props
  useEffect(() => {
    setBackground(normalizeBackgroundType(initialBg));
  }, [initialBg, setBackground]);

  // Use useEffectEvent to separate event logic from effect dependencies
  const onInsert = useEffectEvent(async (payload: { new: CalledNumber }) => {
    const newNumber = payload.new;

    // Start drum roll animation when new number is inserted
    await startDrumRoll(newNumber.value);

    // Update query cache AFTER animation completes
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
      .channel(`screen-${spaceId}-called-numbers`)
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
      .subscribe((status) => {
        // Handle subscription status
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `Supabase subscription error for screen-${spaceId}:`,
            status
          );
        } else if (status === "SUBSCRIBED") {
          console.info(
            `Supabase subscription established for screen-${spaceId}`
          );
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId]);

  const currentNumber =
    calledNumbers.length > 0 ? (calledNumbers.at(-1)?.value ?? null) : null;

  // Show drum roll number during animation, otherwise show the current number
  const displayNumber = isAnimating ? drumRollNumber : currentNumber;

  const history = calledNumbers.map((n) => n.value);
  const historySet = new Set(history); // For O(1) lookup performance
  const participationUrl = `${baseUrl}/${locale}/spaces/${shareKey}`;

  const isMinimal = mode === "minimal";

  return (
    <div className="fixed inset-0 min-h-screen w-full overflow-hidden transition-colors duration-300">
      {isMinimal ? (
        /* Minimal Mode: Current Number Only */
        <div className="flex h-screen w-full items-center justify-center">
          {displayNumber !== null ? (
            <motion.h1
              animate={{ scale: 1, opacity: 1 }}
              className="font-black text-[clamp(8rem,20vw,16rem)] text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)]"
              initial={{ scale: 0, opacity: 0 }}
              key={displayNumber}
              style={{
                WebkitTextStroke: "3px black",
                textShadow:
                  "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)",
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
            >
              {displayNumber}
            </motion.h1>
          ) : (
            <div className="text-center">
              <p
                className="font-bold text-4xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
                style={{ WebkitTextStroke: "1px black" }}
              >
                {t("waitingForNumbers")}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Full Mode: 2-Column Layout (Landscape) / Vertical Stack (Portrait) */
        <div className="flex h-screen w-full flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
          {/* Left Panel: Current Number + QR Code */}
          <div className="flex flex-col items-center justify-center gap-6 lg:w-[35%] lg:gap-8">
            {/* Current Number */}
            <div className="flex flex-1 items-center justify-center">
              {displayNumber !== null ? (
                <motion.h1
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-black text-[clamp(6rem,15vw,12rem)] text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)] lg:text-[clamp(8rem,20vh,20rem)]"
                  initial={{ scale: 0, opacity: 0 }}
                  key={displayNumber}
                  style={{
                    WebkitTextStroke: "3px black",
                    textShadow:
                      "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                >
                  {displayNumber}
                </motion.h1>
              ) : (
                <div className="text-center">
                  <p
                    className="font-bold text-3xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] lg:text-4xl"
                    style={{ WebkitTextStroke: "1px black" }}
                  >
                    {t("waitingForNumbers")}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG
                  aria-label={t("scanToJoin")}
                  size={160}
                  title={t("scanToJoin")}
                  value={participationUrl}
                />
              </div>
              <p className="text-center font-bold text-sm text-white">
                {t("scanToJoin")}
              </p>
            </div>
          </div>

          {/* Right Panel: History Grid */}
          <div className="flex flex-1 items-center rounded-xl bg-black/70 p-4 backdrop-blur-md lg:w-[65%] lg:p-6">
            <div className="w-full">
              <h2 className="mb-3 font-bold text-white text-xl lg:mb-4">
                {t("calledNumbers")}
              </h2>
              <div className="grid grid-cols-10 gap-1.5 lg:grid-cols-[repeat(15,minmax(0,1fr))] lg:gap-2">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
                  const isCalled = historySet.has(number);
                  return (
                    <div
                      className={cn(
                        "flex aspect-square items-center justify-center rounded font-bold text-xs lg:text-sm",
                        isCalled
                          ? "bg-blue-600 text-white"
                          : "border border-gray-500 bg-gray-800/50 text-gray-500"
                      )}
                      key={number}
                    >
                      {number}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Hover-only panel without primary interaction */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover-only panel without primary interaction */}
      <div
        className={cn(
          "fixed top-4 right-4 z-50 transition-opacity duration-200",
          showSettings ? "opacity-100" : "opacity-0 hover:opacity-100"
        )}
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
      >
        <div className="rounded-lg border border-gray-600 bg-black/90 p-3 text-white backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <p className="font-semibold text-sm">{t("displaySettings")}</p>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="mb-1 text-gray-400">{t("displayMode")}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setMode("full")}
                  size="sm"
                  type="button"
                  variant={mode === "full" ? "default" : "outline"}
                >
                  {t("modeFull")}
                </Button>
                <Button
                  onClick={() => setMode("minimal")}
                  size="sm"
                  type="button"
                  variant={mode === "minimal" ? "default" : "outline"}
                >
                  {t("modeMinimal")}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-gray-400">{t("background")}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setBackground("default")}
                  size="sm"
                  type="button"
                  variant={background === "default" ? "default" : "outline"}
                >
                  {t("bgDefault")}
                </Button>
                <Button
                  onClick={() => setBackground("transparent")}
                  size="sm"
                  type="button"
                  variant={background === "transparent" ? "default" : "outline"}
                >
                  {t("bgTransparent")}
                </Button>
                <Button
                  onClick={() => setBackground("green")}
                  size="sm"
                  type="button"
                  variant={background === "green" ? "default" : "outline"}
                >
                  {t("bgGreen")}
                </Button>
                <Button
                  onClick={() => setBackground("blue")}
                  size="sm"
                  type="button"
                  variant={background === "blue" ? "default" : "outline"}
                >
                  {t("bgBlue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
