"use client";

import { motion } from "motion/react";
import { Settings } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

interface Props {
  initialMode?: string;
  initialBg?: string;
  shareKey: string;
  spaceId: string;
}

type DisplayMode = "full" | "minimal";
type BackgroundType = "default" | "transparent" | "green" | "blue";

export function ScreenDisplay({ initialMode = "full", initialBg = "default", shareKey, spaceId }: Props) {
  const t = useTranslations("ScreenView");
  const [calledNumbers, setCalledNumbers] = useState<CalledNumber[]>([]);
  const [mode, setMode] = useState<DisplayMode>(initialMode as DisplayMode);
  const [bg, setBg] = useState<BackgroundType>(initialBg as BackgroundType);
  const [showSettings, setShowSettings] = useState(false);

  // Hide header and footer on mount
  useEffect(() => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const originalHeaderDisplay = header?.style.display || "";
    const originalFooterDisplay = footer?.style.display || "";

    if (header) {
      header.style.display = "none";
    }
    if (footer) {
      footer.style.display = "none";
    }

    return () => {
      if (header) {
        header.style.display = originalHeaderDisplay;
      }
      if (footer) {
        footer.style.display = originalFooterDisplay;
      }
    };
  }, []);

  // Apply background to body
  useEffect(() => {
    const body = document.body;
    const parent = body.parentElement; // html element
    const originalBodyBg = body.style.backgroundColor;
    const originalParentBg = parent?.style.backgroundColor || "";
    
    let bgColor = "#020617"; // slate-950
    if (bg === "transparent") {
      bgColor = "transparent";
    } else if (bg === "green") {
      bgColor = "#00FF00";
    } else if (bg === "blue") {
      bgColor = "#0000FF";
    }

    body.style.backgroundColor = bgColor;
    if (parent) {
      parent.style.backgroundColor = bgColor;
    }

    return () => {
      body.style.backgroundColor = originalBodyBg;
      if (parent) {
        parent.style.backgroundColor = originalParentBg;
      }
    };
  }, [bg]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase
        .from("called_numbers")
        .select("id, space_id, value, called_at")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (!isMounted) {
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

  const currentNumber = calledNumbers.length > 0 ? calledNumbers.at(-1)?.value ?? null : null;
  const history = calledNumbers.map((n) => n.value);
  const participationUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/spaces/${shareKey}`
    : "";

  const isMinimal = mode === "minimal";

  return (
    <div className="fixed inset-0 min-h-screen w-full overflow-hidden transition-colors duration-300">
      {/* Current Number Display */}
      <div className={cn(
        "flex items-center justify-center",
        isMinimal ? "h-screen w-full" : "h-[60vh]"
      )}>
        {currentNumber !== null ? (
          <motion.h1
            key={currentNumber}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
            className="font-black text-[clamp(8rem,20vw,16rem)] text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)]"
            style={{
              WebkitTextStroke: "3px black",
              textShadow: "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)"
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
              <h2 className="mb-3 font-bold text-white text-xl">{t("calledNumbers")}</h2>
              <div className="grid grid-cols-10 gap-1.5 md:grid-cols-[repeat(15,minmax(0,1fr))] md:gap-2">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
                  const isCalled = history.includes(number);
                  return (
                    <div
                      key={number}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded font-bold text-xs md:text-sm",
                        isCalled
                          ? "bg-blue-600 text-white"
                          : "border border-gray-500 bg-gray-800/50 text-gray-500"
                      )}
                    >
                      {number}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Code */}
            {participationUrl && (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={participationUrl} size={120} />
                </div>
                <p className="text-center text-white text-xs">{t("scanToJoin")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Menu */}
      {/* biome-ignore lint/a11y/useSemanticElements: Settings panel with nested interactive buttons */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "fixed top-4 right-4 z-50 transition-opacity duration-200",
          showSettings ? "opacity-100" : "opacity-0 hover:opacity-100"
        )}
        onMouseEnter={() => setShowSettings(true)}
        onMouseLeave={() => setShowSettings(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setShowSettings(!showSettings);
          }
        }}
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
                  onClick={() => setMode("full")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    mode === "full" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
                  type="button"
                >
                  {t("modeFull")}
                </button>
                <button
                  onClick={() => setMode("minimal")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    mode === "minimal" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
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
                  onClick={() => setBg("default")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    bg === "default" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
                  type="button"
                >
                  {t("bgDefault")}
                </button>
                <button
                  onClick={() => setBg("transparent")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    bg === "transparent" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
                  type="button"
                >
                  {t("bgTransparent")}
                </button>
                <button
                  onClick={() => setBg("green")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    bg === "green" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
                  type="button"
                >
                  {t("bgGreen")}
                </button>
                <button
                  onClick={() => setBg("blue")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    bg === "blue" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                  )}
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
