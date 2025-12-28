"use client";

import { Settings } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useBackground } from "../../_context/background-context";

interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

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
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([]);
  const [mode, setMode] = useState<DisplayMode>(
    normalizeDisplayMode(initialMode)
  );
  const [showSettings, setShowSettings] = useState(false);

  // Use background context instead of local state
  const { background, setBackground } = useBackground();

  // Initialize background from props
  useEffect(() => {
    setBackground(normalizeBackgroundType(initialBg));
  }, [initialBg, setBackground]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data, error: queryError } = await supabase
        .from("called_numbers")
        .select("id, space_id, value, called_at")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (queryError) {
        console.error("Error fetching called numbers:", queryError);
        // Silently fail - just show no numbers
        return;
      }

      if (data) {
        setCalledNumbers(data);
      }

      channel = supabase
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
            if (!isMounted) {
              return;
            }
            const newNumber = payload.new as CalledNumber;
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
        .subscribe((status) => {
          if (!isMounted) {
            return;
          }
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
    };

    init();

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [spaceId]);

  const currentNumber =
    calledNumbers.length > 0 ? (calledNumbers.at(-1)?.value ?? null) : null;
  const history = calledNumbers.map((n) => n.value);
  const historySet = new Set(history); // For O(1) lookup performance
  const participationUrl = `${baseUrl}/${locale}/spaces/${shareKey}`;

  const isMinimal = mode === "minimal";

  return (
    <div className="fixed inset-0 min-h-screen w-full overflow-hidden transition-colors duration-300">
      {/* Current Number Display */}
      <div
        className={cn(
          "flex items-center justify-center",
          isMinimal ? "h-screen w-full" : "h-[60vh]"
        )}
      >
        {currentNumber !== null ? (
          <motion.h1
            animate={{ scale: 1, opacity: 1 }}
            className="font-black text-[clamp(8rem,20vw,16rem)] text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)]"
            initial={{ scale: 0, opacity: 0 }}
            key={currentNumber}
            style={{
              WebkitTextStroke: "3px black",
              textShadow: "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)",
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            {currentNumber}
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

      {/* Full Mode: History and QR Code */}
      {!isMinimal && (
        <div className="absolute bottom-0 w-full bg-black/70 p-6 backdrop-blur-md md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* History Grid */}
            <div className="flex-1">
              <h2 className="mb-3 font-bold text-white text-xl">
                {t("calledNumbers")}
              </h2>
              <div className="grid grid-cols-10 gap-1.5 md:grid-cols-[repeat(15,minmax(0,1fr))] md:gap-2">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
                  const isCalled = historySet.has(number);
                  return (
                    <div
                      className={cn(
                        "flex aspect-square items-center justify-center rounded font-bold text-xs md:text-sm",
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

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG
                  aria-label={t("scanToJoin")}
                  size={120}
                  title={t("scanToJoin")}
                  value={participationUrl}
                />
              </div>
              <p className="text-center text-white text-xs">
                {t("scanToJoin")}
              </p>
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
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    mode === "full"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setMode("full")}
                  type="button"
                >
                  {t("modeFull")}
                </button>
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    mode === "minimal"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setMode("minimal")}
                  type="button"
                >
                  {t("modeMinimal")}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-gray-400">{t("background")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    background === "default"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setBackground("default")}
                  type="button"
                >
                  {t("bgDefault")}
                </button>
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    background === "transparent"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setBackground("transparent")}
                  type="button"
                >
                  {t("bgTransparent")}
                </button>
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    background === "green"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setBackground("green")}
                  type="button"
                >
                  {t("bgGreen")}
                </button>
                <button
                  className={cn(
                    "rounded px-2 py-1 transition",
                    background === "blue"
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  )}
                  onClick={() => setBackground("blue")}
                  type="button"
                >
                  {t("bgBlue")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
