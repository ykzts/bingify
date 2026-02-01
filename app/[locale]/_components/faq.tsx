import type { ReactNode } from "react";

interface FaqProps {
  answer1: string;
  answer2: string;
  answer3: ReactNode;
  answer4: string;
  answer5: ReactNode;
  heading: string;
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
  question1,
  question2,
  question3,
  question4,
  question5,
}: FaqProps) {
  const faqs = [
    {
      answer: answer1,
      id: "cost",
      question: question1,
    },
    {
      answer: answer2,
      id: "participant-limits",
      question: question2,
    },
    {
      answer: answer3,
      id: "data-retention",
      question: question3,
    },
    {
      answer: answer4,
      id: "commercial-use",
      question: question4,
    },
    {
      answer: answer5,
      id: "source-code",
      question: question5,
    },
  ];

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h2 className="font-semibold text-2xl text-foreground sm:text-3xl">
            {heading}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              className="rounded-lg border border-border bg-card p-5"
              key={faq.id}
            >
              <h3 className="mb-2 font-medium text-card-foreground">
                {faq.question}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
