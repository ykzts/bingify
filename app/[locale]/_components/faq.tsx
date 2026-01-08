"use client";

import { motion } from "motion/react";

interface FaqProps {
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  answer5: string;
  heading: string;
  maxParticipants: number;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  question5: string;
}

export function Faq({
  answer1,
  answer2,
  answer3,
  answer4,
  answer5,
  heading,
  maxParticipants: _maxParticipants,
  question1,
  question2,
  question3,
  question4,
  question5,
}: FaqProps) {
  const faqs = [
    {
      answer: answer1,
      id: "commercial-use",
      question: question1,
    },
    {
      answer: answer2,
      id: "cost",
      question: question2,
    },
    {
      answer: answer3,
      id: "participant-limits",
      question: question3,
    },
    {
      answer: (
        <>
          {answer4.split("GitHub")[0]}
          <a
            aria-label="View source code on GitHub (opens in a new window)"
            className="text-primary underline hover:text-primary/80"
            href="https://github.com/ykzts/bingify"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          {answer4.split("GitHub")[1]}
        </>
      ),
      id: "source-code",
      question: question4,
    },
    { answer: answer5, id: "data-retention", question: question5 },
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
