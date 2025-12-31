import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Faq } from "./_components/faq";
import { Features } from "./_components/features";
import { FloatingParticles } from "./_components/floating-particles";
import { Hero } from "./_components/hero";
import { Support } from "./_components/support";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tFeatures = await getTranslations("Features");
  const tFaq = await getTranslations("Faq");
  const tSupport = await getTranslations("Support");

  // Fetch system settings to get the actual max participants value
  const supabase = await createClient();
  const { data: systemSettings } = await supabase
    .from("system_settings")
    .select("max_participants_per_space")
    .eq("id", 1)
    .single();

  const maxParticipants = systemSettings?.max_participants_per_space ?? 50;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans">
      <div suppressHydrationWarning>
        <FloatingParticles />
      </div>
      <main>
        <Hero
          badge1={tHero("badge1")}
          badge2={tHero("badge2")}
          badge3={tHero("badge3")}
          ctaButton={tHero("ctaButton")}
          description={tHero("description")}
          descriptionLine2={tHero("descriptionLine2")}
          title={tHero("title")}
          titleHighlight={tHero("titleHighlight")}
        />
        <Features
          communityDescription={tFeatures("communityDescription")}
          communityTitle={tFeatures("communityTitle")}
          heading={tFeatures("heading")}
          noAppDescription={tFeatures("noAppDescription")}
          noAppTitle={tFeatures("noAppTitle")}
          realtimeDescription={tFeatures("realtimeDescription")}
          realtimeTitle={tFeatures("realtimeTitle")}
          subheading={tFeatures("subheading")}
        />
        <Faq
          answer1={tFaq("answer1", { maxParticipants })}
          answer2={tFaq("answer2")}
          answer3={tFaq("answer3")}
          heading={tFaq("heading")}
          maxParticipants={maxParticipants}
          question1={tFaq("question1")}
          question2={tFaq("question2")}
          question3={tFaq("question3")}
        />
        <Support
          description={tSupport("description")}
          heading={tSupport("heading")}
          sponsorButton={tSupport("sponsorButton")}
        />
      </main>
    </div>
  );
}
