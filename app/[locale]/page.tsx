import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Faq } from "./_components/faq";
import { FaqFallback } from "./_components/faq/fallback";
import { Features } from "./_components/features";
import { FloatingParticles } from "./_components/floating-particles";
import { Hero } from "./_components/hero";
import { Support } from "./_components/support";

export const dynamic = "force-static";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans">
      <div suppressHydrationWarning>
        <FloatingParticles />
      </div>
      <main>
        <Hero />
        <Features />
        <Suspense fallback={<FaqFallback />}>
          <Faq />
        </Suspense>
        <Support />
      </main>
    </div>
  );
}
