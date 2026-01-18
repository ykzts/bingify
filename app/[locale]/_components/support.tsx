import { Heart } from "lucide-react";
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-primary/5 to-accent/5 p-12 text-center shadow-sm">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>

          <h2 className="mb-4 font-bold text-3xl text-text-main sm:text-4xl">
            {heading}
          </h2>

          <p className="mb-8 text-lg text-text-muted leading-relaxed">
            {description}
          </p>

          <Button asChild className="rounded-full px-8 py-4 text-lg" size="lg">
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
        </div>
      </div>
    </section>
  );
}
