import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { generateAlternateLanguages } from "@/lib/utils/url";
import { FaqWrapper } from "./_components/faq-wrapper";
import { Features } from "./_components/features";
import { FloatingParticles } from "./_components/floating-particles";
import { Hero } from "./_components/hero";
import { Support } from "./_components/support";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: "/",
      languages: generateAlternateLanguages("/"),
    },
  };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tFeatures = await getTranslations("Features");
  const tSupport = await getTranslations("Support");

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
        <FaqWrapper />
        <Support
          description={tSupport("description")}
          heading={tSupport("heading")}
          sponsorButton={tSupport("sponsorButton")}
        />
      </main>
    </div>
  );
}
