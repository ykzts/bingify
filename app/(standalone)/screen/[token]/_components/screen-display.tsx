"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Maximize, Minimize } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useScreen } from "@/components/providers/screen-provider";
import type { CalledNumber } from "@/hooks/use-called-numbers";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { useDrumRoll } from "@/hooks/use-drum-roll";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { createClient } from "@/lib/supabase/client";
import type {
  BackgroundType,
  DisplayMode,
  ThemeType,
} from "@/lib/types/screen-settings";
import { cn } from "@/lib/utils";
import { NotificationBanner } from "./notification-banner";

interface Props {
  baseUrl: string;
  initialBg: BackgroundType;
  initialMode: DisplayMode;
  initialTheme: ThemeType;
  locale: string;
  shareKey: string;
  spaceId: string;
}

interface ParticipantUpdate {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  profiles?: {
    full_name: string | null;
  } | null;
  user_id: string;
}

interface NotificationState {
  id: string;
  message: string;
  type: "bingo" | "reach";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex UI component with multiple state management and realtime subscriptions
export function ScreenDisplay({
  baseUrl,
  initialBg,
  initialMode,
  initialTheme,
  locale,
  shareKey,
  spaceId,
}: Props) {
  const t = useTranslations("ScreenView");
  const queryClient = useQueryClient();
  const { data: calledNumbers = [] } = useCalledNumbers(spaceId, { retry: 3 });
  const [mode, setMode] = useState<DisplayMode>(initialMode);
  const [theme, setTheme] = useState<ThemeType>(initialTheme);
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    currentNumber: drumRollNumber,
    isAnimating,
    startDrumRoll,
  } = useDrumRoll({
    duration: 1800, // 1.8 seconds
  });

  // フルスクリーン機能
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Use screen context for background and locale state
  const { locale: contextLocale, setBackground, setLocale } = useScreen();

  // Initialize background and theme from props
  useEffect(() => {
    setBackground(initialBg);
    setTheme(initialTheme);
  }, [initialBg, initialTheme, setBackground]);

  // Use useEffectEvent to handle screen settings changes without including functions in deps
  const handleScreenSettingsChange = useEffectEvent(
    (payload: {
      eventType: string;
      new: {
        background: BackgroundType;
        display_mode: DisplayMode;
        locale?: string;
        theme: ThemeType;
      };
    }) => {
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        const newSettings = payload.new;
        setMode(newSettings.display_mode);
        setBackground(newSettings.background);
        setTheme(newSettings.theme);
        // Update locale and reload page for translations to update
        if (newSettings.locale && newSettings.locale !== contextLocale) {
          setLocale(newSettings.locale as "en" | "ja");
          // Reload page to apply new translations
          window.location.reload();
        }
      }
    }
  );

  // Subscribe to realtime screen settings changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`screen-settings-${spaceId}`)
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "screen_settings",
        },
        handleScreenSettingsChange as (payload: unknown) => void
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `Screen settings subscription error for space ${spaceId}:`,
            status
          );
        } else if (status === "SUBSCRIBED") {
          console.info(
            `Screen settings subscription established for space ${spaceId}`
          );
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

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
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

  // Helper function to fetch participant profile
  const fetchParticipantProfile = async (
    userId: string
  ): Promise<string | null> => {
    const supabase = createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.warn(`Failed to fetch profile for user ${userId}:`, profileError);
    }

    return profile?.full_name || null;
  };

  // Use useEffectEvent for participants update handling
  const onParticipantUpdate = useEffectEvent(
    async (payload: { new: ParticipantUpdate }) => {
      const updated = payload.new;

      // Validate payload structure (check for null/undefined, not falsy values)
      if (
        updated?.id == null ||
        updated.user_id == null ||
        updated.bingo_status == null
      ) {
        console.error("Invalid participant update payload:", payload);
        return;
      }

      // Validate bingo_status value
      if (!["none", "reach", "bingo"].includes(updated.bingo_status)) {
        console.error("Invalid bingo_status value:", updated.bingo_status);
        return;
      }

      // Show notification for bingo or reach
      if (
        updated.bingo_status === "bingo" ||
        updated.bingo_status === "reach"
      ) {
        // Clear any existing timeout
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }

        // Fetch profile information from profiles table
        const fullName = await fetchParticipantProfile(updated.user_id);
        const displayName = fullName || t("guestName");
        const messageKey =
          updated.bingo_status === "bingo"
            ? "notificationBingo"
            : "notificationReach";
        const message = t(messageKey, { name: displayName });

        // Set notification with unique ID to trigger re-render
        setNotification({
          id: `${updated.id}-${updated.bingo_status}-${Date.now()}`,
          message,
          type: updated.bingo_status,
        });

        // Auto-hide notification after duration
        const duration = updated.bingo_status === "bingo" ? 5000 : 3000;
        notificationTimeoutRef.current = setTimeout(() => {
          setNotification(null);
          notificationTimeoutRef.current = null;
        }, duration);
      }
    }
  );

  // Subscribe to participants updates for bingo/reach notifications
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`screen-${spaceId}-participants`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `space_id=eq.${spaceId}`,
          schema: "public",
          table: "participants",
        },
        (payload) => {
          const updated = payload.new as ParticipantUpdate;
          onParticipantUpdate({ new: updated });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `Participants subscription error for screen-${spaceId}:`,
            status
          );
        } else if (status === "SUBSCRIBED") {
          console.info(
            `Participants subscription established for screen-${spaceId}`
          );
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

  // Cleanup notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const currentNumber =
    calledNumbers.length > 0 ? (calledNumbers.at(-1)?.value ?? null) : null;

  // Show drum roll number during animation, otherwise show the current number
  const displayNumber = isAnimating ? drumRollNumber : currentNumber;

  const history = calledNumbers.map((n) => n.value);
  const historySet = new Set(history); // For O(1) lookup performance
  const participationUrl = `${baseUrl}/${locale}/spaces/${shareKey}`;

  const isMinimal = mode === "minimal";

  // Theme-aware text colors
  const textColor = theme === "light" ? "text-gray-900" : "text-white";

  return (
    <div
      className={cn(
        "fixed inset-0 min-h-screen w-full overflow-hidden transition-colors duration-300",
        theme === "light" ? "bg-white" : ""
      )}
    >
      {/* フルスクリーンボタン */}
      <button
        aria-label={isFullscreen ? t("exitFullscreen") : t("requestFullscreen")}
        className={cn(
          "group fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200 hover:scale-105",
          theme === "light"
            ? "bg-white/90 text-gray-900 shadow-lg hover:bg-white hover:shadow-xl"
            : "bg-black/75 text-white shadow-black/50 shadow-lg hover:bg-black/90 hover:shadow-xl"
        )}
        onClick={toggleFullscreen}
        title={t("fullscreenHint")}
        type="button"
      >
        {isFullscreen ? (
          <Minimize className="h-5 w-5" />
        ) : (
          <Maximize className="h-5 w-5" />
        )}
        <span className="hidden sm:inline">
          {isFullscreen ? t("exitFullscreen") : t("requestFullscreen")}
        </span>
      </button>

      {/* Notification Banner */}
      <AnimatePresence>
        {notification && (
          <NotificationBanner
            key={notification.id}
            message={notification.message}
            type={notification.type}
          />
        )}
      </AnimatePresence>

      {isMinimal ? (
        /* Minimal Mode: Current Number Only */
        <div className="flex h-screen w-full items-center justify-center">
          {displayNumber !== null ? (
            <motion.h1
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "font-black text-[clamp(10rem,25vw,20rem)] leading-none",
                textColor
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              key={displayNumber}
              style={{
                textShadow:
                  theme === "light"
                    ? "0 4px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1), 2px 2px 0 rgba(0,0,0,0.1)"
                    : "0 4px 16px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.7), 4px 4px 0 rgba(0,0,0,0.6)",
                WebkitTextStroke:
                  theme === "light"
                    ? "2px rgba(0,0,0,0.15)"
                    : "2px rgba(0,0,0,0.8)",
              }}
              transition={{
                damping: 25,
                stiffness: 300,
                type: "spring",
              }}
            >
              {displayNumber}
            </motion.h1>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p
                className={cn(
                  "font-bold text-[clamp(2rem,5vw,4rem)] leading-tight",
                  textColor
                )}
                style={{
                  textShadow:
                    theme === "light"
                      ? "0 2px 8px rgba(0,0,0,0.12)"
                      : "0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
                  WebkitTextStroke:
                    theme === "light"
                      ? "1px rgba(0,0,0,0.1)"
                      : "1px rgba(0,0,0,0.6)",
                }}
              >
                {t("waitingForNumbers")}
              </p>
            </motion.div>
          )}
        </div>
      ) : (
        /* Full Mode: 2-Column Layout (Landscape) / Vertical Stack (Portrait) */
        <div className="flex h-screen w-full flex-col gap-6 p-6 md:gap-8 md:p-8 lg:flex-row lg:gap-10 lg:p-10">
          {/* Left Panel: Current Number + QR Code */}
          <div className="flex flex-col items-center justify-center gap-8 lg:w-[40%] lg:gap-10">
            {/* Current Number */}
            <div className="flex flex-1 items-center justify-center">
              {displayNumber !== null ? (
                <motion.h1
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "font-black text-[clamp(8rem,18vw,14rem)] leading-none lg:text-[clamp(10rem,18vh,18rem)]",
                    textColor
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  key={displayNumber}
                  style={{
                    textShadow:
                      theme === "light"
                        ? "0 4px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1), 2px 2px 0 rgba(0,0,0,0.1)"
                        : "0 4px 16px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.7), 4px 4px 0 rgba(0,0,0,0.6)",
                    WebkitTextStroke:
                      theme === "light"
                        ? "2px rgba(0,0,0,0.15)"
                        : "2px rgba(0,0,0,0.8)",
                  }}
                  transition={{
                    damping: 25,
                    stiffness: 300,
                    type: "spring",
                  }}
                >
                  {displayNumber}
                </motion.h1>
              ) : (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <p
                    className={cn(
                      "font-bold text-[clamp(2rem,4vw,3.5rem)] leading-tight lg:text-[clamp(2.5rem,4vh,4rem)]",
                      textColor
                    )}
                    style={{
                      textShadow:
                        theme === "light"
                          ? "0 2px 8px rgba(0,0,0,0.12)"
                          : "0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
                      WebkitTextStroke:
                        theme === "light"
                          ? "1px rgba(0,0,0,0.1)"
                          : "1px rgba(0,0,0,0.6)",
                    }}
                  >
                    {t("waitingForNumbers")}
                  </p>
                </motion.div>
              )}
            </div>

            {/* QR Code */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="rounded-2xl bg-white p-5 shadow-lg">
                <QRCodeSVG
                  aria-label={t("scanToJoin")}
                  size={180}
                  title={t("scanToJoin")}
                  value={participationUrl}
                />
              </div>
              <p
                className={cn(
                  "text-center font-semibold text-base leading-tight",
                  textColor
                )}
                style={{
                  textShadow:
                    theme === "light"
                      ? "0 1px 2px rgba(0,0,0,0.1)"
                      : "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                {t("scanToJoin")}
              </p>
            </motion.div>
          </div>

          {/* Right Panel: History Grid */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex flex-1 items-center rounded-2xl p-6 shadow-lg backdrop-blur-md md:p-8 lg:w-[60%]",
              theme === "light"
                ? "bg-white/90 shadow-black/5"
                : "bg-black/75 shadow-black/50"
            )}
            initial={{ opacity: 0, x: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="w-full">
              <h2
                className={cn(
                  "mb-4 font-bold text-2xl leading-tight md:mb-6 md:text-3xl",
                  textColor
                )}
                style={{
                  textShadow:
                    theme === "light"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "0 2px 4px rgba(0,0,0,0.6)",
                }}
              >
                {t("calledNumbers")}
              </h2>
              <div className="grid grid-cols-10 gap-2 md:gap-2.5 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => {
                  const isCalled = historySet.has(number);

                  // Determine classes based on called status and theme
                  let numberClasses = "";
                  if (isCalled) {
                    numberClasses =
                      theme === "light"
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                        : "bg-blue-600 text-white shadow-md shadow-blue-600/50";
                  } else {
                    numberClasses =
                      theme === "light"
                        ? "border-2 border-gray-300 bg-gray-100 text-gray-600"
                        : "border-2 border-gray-600 bg-gray-800/60 text-gray-400";
                  }

                  return (
                    <motion.div
                      animate={
                        isCalled
                          ? {
                              backgroundColor:
                                theme === "light"
                                  ? "rgb(59, 130, 246)"
                                  : "rgb(37, 99, 235)",
                              scale: 1,
                            }
                          : {}
                      }
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-lg font-bold text-sm transition-colors duration-300 md:rounded-xl md:text-base",
                        numberClasses
                      )}
                      initial={false}
                      key={number}
                      transition={{
                        damping: 15,
                        stiffness: 200,
                        type: "spring",
                      }}
                    >
                      {number}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
