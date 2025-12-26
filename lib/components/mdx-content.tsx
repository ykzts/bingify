import type { Metadata } from "next";

interface MDXModule {
  default: React.ComponentType;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
}

interface MDXContentProps {
  locale: string;
  contentPath: string;
}

export async function loadMDXContent(
  locale: string,
  contentPath: string
): Promise<MDXModule> {
  const module = await import(`@/content/${locale}/${contentPath}.mdx`);
  return module as MDXModule;
}

export async function getMDXMetadata(
  locale: string,
  contentPath: string
): Promise<Metadata> {
  const module = await loadMDXContent(locale, contentPath);
  const title = module.metadata?.title;

  return {
    title: title || "Bingify",
  };
}

export async function MDXContent({ locale, contentPath }: MDXContentProps) {
  const module = await loadMDXContent(locale, contentPath);
  const Content = module.default;

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="prose prose-slate lg:prose-lg mx-auto">
          <Content />
        </div>
      </div>
    </div>
  );
}
