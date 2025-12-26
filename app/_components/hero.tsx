"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <motion.h1
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 font-bold text-4xl text-text-main sm:text-5xl md:text-6xl"
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{
            delay: 0.3,
            duration: 0.5,
            type: "spring",
          }}
        >
          すべての画面を、
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            熱狂の会場に。
          </span>
        </motion.h1>

        <motion.p
          animate={{ opacity: 1 }}
          className="mb-10 text-lg text-text-muted sm:text-xl"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          リアルタイムで盛り上がる、新しいビンゴ体験。
          <br />
          アプリ不要、URLを共有するだけで誰でも参加できます。
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Link
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-lg text-primary-foreground shadow-lg"
            href="/dashboard"
          >
            <motion.span
              className="inline-flex items-center gap-2"
              transition={{
                damping: 10,
                stiffness: 300,
                type: "spring",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ビンゴ会場を作る
              <motion.span
                animate={shouldReduceMotion ? {} : { x: [0, 4, 0] }}
                className="inline-block"
                transition={{
                  duration: 1.5,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.span>
            </motion.span>
          </Link>
        </motion.div>

        <motion.div
          animate={{ opacity: 1 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            無料で始める
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
            登録不要
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            リアルタイム同期
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
