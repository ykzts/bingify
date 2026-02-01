import { Globe, Users, Zap } from "lucide-react";

interface FeaturesProps {
  communityDescription: string;
  communityTitle: string;
  heading: string;
  noAppDescription: string;
  noAppTitle: string;
  realtimeDescription: string;
  realtimeTitle: string;
  subheading: string;
}

export function Features({
  communityDescription,
  communityTitle,
  heading,
  noAppDescription,
  noAppTitle,
  realtimeDescription,
  realtimeTitle,
  subheading,
}: FeaturesProps) {
  const features = [
    {
      description: realtimeDescription,
      icon: Zap,
      title: realtimeTitle,
    },
    {
      description: communityDescription,
      icon: Users,
      title: communityTitle,
    },
    {
      description: noAppDescription,
      icon: Globe,
      title: noAppTitle,
    },
  ];

  return (
    <section className="border-border border-t bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-semibold text-2xl text-foreground sm:text-3xl">
            {heading}
          </h2>
          <p className="text-muted-foreground">{subheading}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                aria-labelledby={`feature-title-${index}`}
                className="rounded-xl border border-border bg-card p-6"
                key={feature.title}
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                <h3
                  className="mb-2 font-medium text-card-foreground"
                  id={`feature-title-${index}`}
                >
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
