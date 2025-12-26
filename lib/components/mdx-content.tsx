import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

interface MDXModule {
  default: React.ComponentType;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
}

interface MDXContentProps {
  contentPath: string;
  locale: string;
}

const ALLOWED_LOCALES = routing.locales;
const CONTENT_PATH_REGEX = /^[a-zA-Z0-9/_-]+$/;

function validateLocale(locale: string): void {
  if (!ALLOWED_LOCALES.includes(locale as (typeof ALLOWED_LOCALES)[number])) {
    throw new Error(`Invalid locale: ${locale}`);
  }
}

function validateContentPath(contentPath: string): void {
  if (!CONTENT_PATH_REGEX.test(contentPath)) {
    throw new Error(`Invalid content path: ${contentPath}`);
  }
  if (contentPath.includes("..") || contentPath.startsWith("/")) {
    throw new Error(`Invalid content path: ${contentPath}`);
  }
}

const FallbackContent = () => (
  <div>
    <h1>Content Not Available</h1>
    <p>The requested content could not be loaded.</p>
  </div>
);

export async function loadMDXContent(
  locale: string,
  contentPath: string
): Promise<MDXModule> {
  validateLocale(locale);
  validateContentPath(contentPath);

  try {
    const module = await import(`@/content/${locale}/${contentPath}.mdx`);
    return module as MDXModule;
  } catch (error) {
    console.error(
      `Failed to load MDX content for locale "${locale}" and path "${contentPath}".`,
      error
    );
    return {
      default: FallbackContent,
      metadata: {
        title: "Content Not Found",
      },
    };
  }
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

export async function MDXContent({ contentPath, locale }: MDXContentProps) {
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
