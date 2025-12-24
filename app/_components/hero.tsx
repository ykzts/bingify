'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="max-w-4xl"
      >
        <motion.h1
          className="mb-6 text-4xl font-bold text-text-main sm:text-5xl md:text-6xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.3,
            duration: 0.5,
            type: 'spring',
          }}
        >
          すべての画面を、
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            熱狂の会場に。
          </span>
        </motion.h1>

        <motion.p
          className="mb-10 text-lg text-text-muted sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          リアルタイムで盛り上がる、新しいビンゴ体験。
          <br />
          アプリ不要、URLを共有するだけで誰でも参加できます。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Link href="/dashboard">
            <motion.button
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                damping: 10,
                stiffness: 300,
                type: 'spring',
              }}
            >
              ビンゴ会場を作る
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{
                  duration: 1.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.span>
            </motion.button>
          </Link>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
  )
}
