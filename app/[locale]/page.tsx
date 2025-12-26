import { getTranslations, setRequestLocale } from "next-intl/server";
import { Features } from "./_components/features";
import { FloatingParticles } from "./_components/floating-particles";
import { Hero } from "./_components/hero";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tFeatures = await getTranslations("Features");

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
      </main>
    </div>
  );
}
