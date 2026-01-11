"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useScreen } from "@/components/providers/screen-provider";
import type { CalledNumber } from "@/hooks/use-called-numbers";
import { useCalledNumbers } from "@/hooks/use-called-numbers";
import { useDrumRoll } from "@/hooks/use-drum-roll";
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
                "font-black text-[clamp(8rem,20vw,16rem)] drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)]",
                textColor
              )}
              initial={{ opacity: 0, scale: 0 }}
              key={displayNumber}
              style={{
                textShadow:
                  theme === "light"
                    ? "0 0 20px rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.2)"
                    : "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)",
                WebkitTextStroke:
                  theme === "light" ? "3px rgba(0,0,0,0.2)" : "3px black",
              }}
              transition={{
                damping: 20,
                stiffness: 260,
                type: "spring",
              }}
            >
              {displayNumber}
            </motion.h1>
          ) : (
            <div className="text-center">
              <p
                className={cn(
                  "font-bold text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]",
                  textColor
                )}
                style={{
                  WebkitTextStroke:
                    theme === "light" ? "1px rgba(0,0,0,0.2)" : "1px black",
                }}
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
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "font-black text-[clamp(6rem,15vw,12rem)] drop-shadow-[0_8px_8px_rgba(0,0,0,0.9)] lg:text-[clamp(8rem,20vh,20rem)]",
                    textColor
                  )}
                  initial={{ opacity: 0, scale: 0 }}
                  key={displayNumber}
                  style={{
                    textShadow:
                      theme === "light"
                        ? "0 0 20px rgba(0,0,0,0.3), 2px 2px 0 rgba(0,0,0,0.2)"
                        : "0 0 20px rgba(0,0,0,0.8), 4px 4px 0 rgba(0,0,0,0.5)",
                    WebkitTextStroke:
                      theme === "light" ? "3px rgba(0,0,0,0.2)" : "3px black",
                  }}
                  transition={{
                    damping: 20,
                    stiffness: 260,
                    type: "spring",
                  }}
                >
                  {displayNumber}
                </motion.h1>
              ) : (
                <div className="text-center">
                  <p
                    className={cn(
                      "font-bold text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] lg:text-4xl",
                      textColor
                    )}
                    style={{
                      WebkitTextStroke:
                        theme === "light" ? "1px rgba(0,0,0,0.2)" : "1px black",
                    }}
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
              <p className={cn("text-center font-bold text-sm", textColor)}>
                {t("scanToJoin")}
              </p>
            </div>
          </div>

          {/* Right Panel: History Grid */}
          <div
            className={cn(
              "flex flex-1 items-center rounded-xl p-4 backdrop-blur-md lg:w-[65%] lg:p-6",
              theme === "light" ? "bg-white/80" : "bg-black/70"
            )}
          >
            <div className="w-full">
              <h2 className={cn("mb-3 font-bold text-xl lg:mb-4", textColor)}>
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
    </div>
  );
}
