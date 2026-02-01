import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupportProps {
  description: string;
  heading: string;
  sponsorButton: string;
}

export function Support({ description, heading, sponsorButton }: SupportProps) {
  return (
    <section className="border-border border-t px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-6 w-6 text-primary" />
        </div>

        <h2 className="mb-3 font-semibold text-2xl text-foreground sm:text-3xl">
          {heading}
        </h2>

        <p className="mb-6 text-muted-foreground">{description}</p>

        <Button asChild variant="outline">
          <a
            aria-label={`${sponsorButton} (opens in a new window)`}
            href="https://github.com/sponsors/ykzts"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Heart className="mr-2 h-4 w-4" />
            {sponsorButton}
          </a>
        </Button>
      </div>
    </section>
  );
}
