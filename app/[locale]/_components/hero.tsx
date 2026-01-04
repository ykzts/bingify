"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function Hero() {
  const t = useTranslations("Hero");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          transition={{
            delay: 0.1,
            duration: 0.5,
            type: "spring",
          }}
        >
          <Image
            alt="Bingify"
            className="h-16 w-auto sm:h-20"
            fetchPriority="high"
            height={80}
            loading="eager"
            preload
            src="/logo.svg"
            width={304}
          />
        </motion.div>

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
          {t("title")}
          <br />
          <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("titleHighlight")}
          </span>
        </motion.h1>

        <motion.p
          animate={{ opacity: 1 }}
          className="mb-10 text-lg text-text-muted sm:text-xl"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {t("description")}
          <br />
          {t("descriptionLine2")}
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Button asChild className="rounded-full px-8 py-4 text-lg" size="lg">
            <Link href="/dashboard">
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
                {t("ctaButton")}
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
          </Button>
        </motion.div>

        <motion.div
          animate={{ opacity: 1 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            {t("badge1")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
            {t("badge2")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {t("badge3")}
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}
