"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface NotificationBannerProps {
  message: string;
  type: "bingo" | "reach";
}

/**
 * アニメーション付き通知バナーコンポーネント
 * ビンゴまたはリーチ達成時に画面上部に表示される
 */
export function NotificationBanner({ message, type }: NotificationBannerProps) {
  // ビンゴとリーチで異なるスタイルを適用
  const isBingo = type === "bingo";

  return (
    <motion.div
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      className={cn(
        "fixed top-8 left-1/2 z-50 -translate-x-1/2 rounded-3xl px-10 py-8 shadow-2xl backdrop-blur-md md:px-12 md:py-10",
        isBingo
          ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-orange-500/50"
          : "bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-purple-500/50"
      )}
      exit={{
        opacity: 0,
        scale: 0.85,
        y: -60,
      }}
      initial={{
        opacity: 0,
        scale: 0.85,
        y: -60,
      }}
      transition={{
        damping: 20,
        duration: 0.5,
        stiffness: 300,
        type: "spring",
      }}
    >
      <motion.div
        animate={{ rotate: [0, -3, 3, -3, 3, 0] }}
        transition={{
          delay: 0.3,
          duration: 0.6,
          ease: "easeInOut",
        }}
      >
        <p
          className="whitespace-nowrap font-black text-3xl text-white md:text-5xl lg:text-6xl"
          style={{
            textShadow:
              "0 2px 12px rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {isBingo ? "🎉 " : "🔥 "}
          {message}
          {isBingo ? " 🎉" : " 🔥"}
        </p>
      </motion.div>
    </motion.div>
  );
}
