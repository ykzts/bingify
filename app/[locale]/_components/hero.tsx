import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
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
  badge1,
  badge2,
  badge3,
  ctaButton,
  description,
  descriptionLine2,
  title,
  titleHighlight,
}: HeroProps) {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <AnimateOnScroll className="max-w-4xl animate-fade-in-up [animation-delay:200ms]">
        <AnimateOnScroll className="mb-8 flex animate-fade-in-scale justify-center [animation-delay:100ms]">
          <Image
            alt="Bingify"
            className="h-16 w-auto sm:h-20"
            fetchPriority="high"
            height={80}
            loading="eager"
            src="/logo.svg"
            width={304}
          />
        </AnimateOnScroll>

        <AnimateOnScroll className="animate-fade-in-up [animation-delay:300ms]">
          <h1 className="mb-6 font-bold text-4xl text-text-main sm:text-5xl md:text-6xl">
            {title}
            <br />
            <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              {titleHighlight}
            </span>
          </h1>
        </AnimateOnScroll>

        <AnimateOnScroll className="mb-10 animate-fade-in-up [animation-delay:500ms]">
          <p className="text-lg text-text-muted sm:text-xl">
            {description}
            <br />
            {descriptionLine2}
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll className="animate-fade-in-up [animation-delay:700ms]">
          <Button asChild className="rounded-full px-8 py-4 text-lg" size="lg">
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-2">
                {ctaButton}
                <span className="inline-block animate-arrow-bounce motion-reduce:animate-none">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </span>
            </Link>
          </Button>
        </AnimateOnScroll>

        <AnimateOnScroll className="mt-8 flex animate-fade-in-up flex-wrap items-center justify-center gap-4 text-sm text-text-muted [animation-delay:900ms]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            {badge1}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
            {badge2}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            {badge3}
          </span>
        </AnimateOnScroll>
      </AnimateOnScroll>
    </section>
  );
}
