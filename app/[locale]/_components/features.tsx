"use client";

import { Globe, Users, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export function Features() {
  const t = useTranslations("Features");

  const features = [
    {
      description: t("realtimeDescription"),
      icon: Zap,
      title: t("realtimeTitle"),
    },
    {
      description: t("communityDescription"),
      icon: Users,
      title: t("communityTitle"),
    },
    {
      description: t("noAppDescription"),
      icon: Globe,
      title: t("noAppTitle"),
    },
  ];

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("subheading")}</p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                aria-labelledby={`feature-title-${index}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                key={feature.title}
                role="article"
                transition={{ delay: index * 0.2, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <motion.div
                  className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                  transition={{
                    duration: 0.6,
                    type: "spring",
                  }}
                  whileHover={{ rotate: 360 }}
                >
                  <Icon className="h-7 w-7 text-primary" />
                </motion.div>

                <h3
                  className="mb-3 font-bold text-card-foreground text-xl"
                  id={`feature-title-${index}`}
                >
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                <motion.div
                  className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-secondary/10"
                  initial={{ scale: 0 }}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.6 }}
                  viewport={{ once: true }}
                  whileInView={{ scale: 1 }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
