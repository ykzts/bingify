import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface HeroProps {
  badge1: string;
  badge2: string;
  badge3: string;
  ctaButton: string;
  description: string;
  descriptionLine2: string;
  title: string;
  titleHighlight: string;
}

export function Hero({
  ctaButton,
  description,
  descriptionLine2,
  title,
  titleHighlight,
}: HeroProps) {
  return (
    <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl">
        <div className="mb-8 flex justify-center">
          <div className="rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border/50">
            <Image
              alt="Bingify"
              className="h-10 w-auto sm:h-12"
              fetchPriority="high"
              height={48}
              loading="eager"
              src="/logo.svg"
              width={182}
            />
          </div>
        </div>

        <h1 className="mb-6 text-balance font-bold text-4xl text-foreground tracking-tight sm:text-5xl md:text-6xl">
          {title}
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {titleHighlight}
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-balance text-lg text-muted-foreground leading-relaxed sm:text-xl">
          {description}
          <br className="hidden sm:block" />
          {descriptionLine2}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild className="min-w-[200px] text-base" size="lg">
            <Link href="/dashboard">
              {ctaButton}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
