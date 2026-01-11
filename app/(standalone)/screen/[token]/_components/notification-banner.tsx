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
        "fixed top-8 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-8 py-6 shadow-2xl backdrop-blur-md",
        isBingo
          ? "bg-gradient-to-r from-yellow-400 to-orange-500"
          : "bg-gradient-to-r from-blue-400 to-purple-500"
      )}
      exit={{
        opacity: 0,
        scale: 0.8,
        y: -50,
      }}
      initial={{
        opacity: 0,
        scale: 0.8,
        y: -50,
      }}
      transition={{
        damping: 15,
        duration: 0.5,
        stiffness: 300,
        type: "spring",
      }}
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
        transition={{
          delay: 0.3,
          duration: 0.6,
          ease: "easeInOut",
        }}
      >
        <p
          className="whitespace-nowrap font-black text-2xl text-white drop-shadow-lg md:text-4xl lg:text-5xl"
          style={{
            textShadow: "0 0 20px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.5)",
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
