"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function Support() {
  const t = useTranslations("Support");

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primary/5 to-accent/5 p-12 text-center shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
            initial={{ scale: 0 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
            viewport={{ once: true }}
            whileInView={{ scale: 1 }}
          >
            <Heart className="h-8 w-8 text-primary" />
          </motion.div>

          <motion.h2
            className="mb-4 font-bold text-3xl text-text-main sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            {t("heading")}
          </motion.h2>

          <motion.p
            className="mb-8 text-lg text-text-muted leading-relaxed"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1 }}
          >
            {t("description")}
          </motion.p>

          <Button asChild className="rounded-full px-8 py-4 text-lg" size="lg">
            <motion.a
              aria-label={`${t("sponsorButton")} (opens in a new window)`}
              href="https://github.com/sponsors/ykzts"
              initial={{ opacity: 0, y: 20 }}
              rel="noopener noreferrer"
              target="_blank"
              transition={{ delay: 0.5, duration: 0.6 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Heart className="h-5 w-5" />
              {t("sponsorButton")}
            </motion.a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
