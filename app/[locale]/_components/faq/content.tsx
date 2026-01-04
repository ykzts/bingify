"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface FaqItem {
  answer: ReactNode;
  id: string;
  question: string;
}

interface FaqContentProps {
  faqs: FaqItem[];
  heading: string;
}

export function FaqContent({ faqs, heading }: FaqContentProps) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            {heading}
          </h2>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              key={faq.id}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-3 font-bold text-card-foreground text-lg">
                {faq.question}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
