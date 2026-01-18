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
  const featuresData = [
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
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-3xl text-foreground sm:text-4xl">
            {heading}
          </h2>
          <p className="text-lg text-muted-foreground">{subheading}</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                aria-labelledby={`feature-title-${index}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:scale-105 hover:shadow-xl"
                key={feature.title}
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-transform duration-600 group-hover:rotate-360">
                  <Icon className="h-7 w-7 text-primary" />
                </div>

                <h3
                  className="mb-3 font-bold text-card-foreground text-xl"
                  id={`feature-title-${index}`}
                >
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-secondary/10" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
