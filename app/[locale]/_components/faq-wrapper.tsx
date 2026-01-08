import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/public-server";
import { Faq } from "./faq";

async function FaqData() {
  const tFaq = await getTranslations("Faq");

  const supabase = createPublicClient();
  const { data: systemSettings, error } = await supabase
    .from("system_settings")
    .select("max_participants_per_space, space_expiration_hours")
    .eq("id", 1)
    .single();

  const maxParticipants = systemSettings?.max_participants_per_space ?? 50;
  const spaceExpirationHours = systemSettings?.space_expiration_hours ?? 0;

  if (error) {
    console.error("Failed to fetch system settings:", error);
  }

  return (
    <Faq
      answer1={tFaq("answer1")}
      answer2={tFaq("answer2", { maxParticipants })}
      answer3={tFaq.rich("answer3", {
        expirationHours: spaceExpirationHours,
        githubLink: (chunks) => (
          <a
            aria-label="View source code on GitHub (opens in a new window)"
            className="text-primary underline hover:text-primary/80"
            href="https://github.com/ykzts/bingify"
            rel="noopener noreferrer"
            target="_blank"
          >
            {chunks}
          </a>
        ),
      })}
      answer4={tFaq("answer4")}
      answer5={tFaq.rich("answer5", {
        githubLink: (chunks) => (
          <a
            aria-label="View source code on GitHub (opens in a new window)"
            className="text-primary underline hover:text-primary/80"
            href="https://github.com/ykzts/bingify"
            rel="noopener noreferrer"
            target="_blank"
          >
            {chunks}
          </a>
        ),
      })}
      heading={tFaq("heading")}
      question1={tFaq("question1")}
      question2={tFaq("question2")}
      question3={tFaq("question3")}
      question4={tFaq("question4")}
      question5={tFaq("question5")}
    />
  );
}

function FaqSkeleton() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
              key={i}
            >
              <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqWrapper() {
  return (
    <Suspense fallback={<FaqSkeleton />}>
      <FaqData />
    </Suspense>
  );
}
