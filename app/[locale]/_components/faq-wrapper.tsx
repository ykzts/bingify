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
      })}
      heading={tFaq("heading")}
      question1={tFaq("question1")}
      question2={tFaq("question2")}
      question3={tFaq("question3")}
    />
  );
}

function FaqSkeleton() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              className="rounded-lg border border-border bg-card p-5"
              key={i}
            >
              <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
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
