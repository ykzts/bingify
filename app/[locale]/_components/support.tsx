import { Heart } from "lucide-react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { Button } from "@/components/ui/button";

interface SupportProps {
  description: string;
  heading: string;
  sponsorButton: string;
}

export function Support({ description, heading, sponsorButton }: SupportProps) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <AnimateOnScroll className="animate-fade-in-scale overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primary/5 to-accent/5 p-12 text-center shadow-sm">
          <div className="mb-6 inline-flex h-16 w-16 animate-fade-in-scale items-center justify-center rounded-full bg-primary/10 [animation-delay:200ms]">
            <Heart className="h-8 w-8 text-primary" />
          </div>

          <h2 className="mb-4 animate-fade-in-up font-bold text-3xl text-text-main [animation-delay:300ms] sm:text-4xl">
            {heading}
          </h2>

          <p className="mb-8 animate-fade-in-up text-lg text-text-muted leading-relaxed [animation-delay:400ms]">
            {description}
          </p>

          <Button
            asChild
            className="animate-fade-in-up rounded-full px-8 py-4 text-lg [animation-delay:500ms]"
            size="lg"
          >
            <a
              aria-label={`${sponsorButton} (opens in a new window)`}
              href="https://github.com/sponsors/ykzts"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Heart className="h-5 w-5" />
              {sponsorButton}
            </a>
          </Button>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
