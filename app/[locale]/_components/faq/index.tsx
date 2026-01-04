import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/client";
import { FaqContent } from "./content";

async function getMaxParticipantsPerSpace() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("max_participants_per_space")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Failed to fetch system settings:", error);
  }

  return data?.max_participants_per_space ?? 50;
}

export async function Faq() {
  const t = await getTranslations("Faq");
  const maxParticipants = await getMaxParticipantsPerSpace();

  const faqs = [
    {
      answer: t("answer1", { maxParticipants }),
      id: "usage-limits",
      question: t("question1"),
    },
    {
      answer: t.rich("answer2", {
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
      }),
      id: "source-code",
      question: t("question2"),
    },
    { answer: t("answer3"), id: "funding", question: t("question3") },
  ];

  return <FaqContent faqs={faqs} heading={t("heading")} />;
}
