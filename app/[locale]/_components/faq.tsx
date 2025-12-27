"use client";

import { motion } from "motion/react";

interface FaqProps {
  heading: string;
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
  question3: string;
  answer3: string;
}

export function Faq({
  answer1,
  answer2,
  answer3,
  heading,
  question1,
  question2,
  question3,
}: FaqProps) {
  const faqs = [
    { answer: answer1, question: question1 },
    { answer: answer2, question: question2 },
    { answer: answer3, question: question3 },
  ];

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
          <h2 className="mb-4 font-bold text-3xl text-text-main sm:text-4xl">
            {heading}
          </h2>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              key={faq.question}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <h3 className="mb-3 font-bold text-lg text-text-main">
                {faq.question}
              </h3>
              <p className="text-text-muted leading-relaxed">{faq.answer}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
