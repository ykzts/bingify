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
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-3xl">
        <div className="mb-6 flex justify-center">
          <Image
            alt="Bingify"
            className="h-12 w-auto sm:h-14"
            fetchPriority="high"
            height={56}
            loading="eager"
            src="/logo.svg"
            width={212}
          />
        </div>

        <h1 className="mb-4 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl">
          {title}
          <br />
          <span className="text-primary">{titleHighlight}</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
          {description}
          <br className="hidden sm:block" />
          {descriptionLine2}
        </p>

        <Button asChild size="lg">
          <Link href="/dashboard">
            {ctaButton}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
