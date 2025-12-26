import { setRequestLocale } from "next-intl/server";
import { Features } from "./_components/features";
import { FloatingParticles } from "./_components/floating-particles";
import { Hero } from "./_components/hero";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
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
      </main>
    </div>
  );
}
