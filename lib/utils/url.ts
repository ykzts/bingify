/**
 * URL generation utilities with Vercel environment support
 */

/**
 * Get the base URL for the application following priority order:
 * 1. NEXT_PUBLIC_SITE_URL (explicitly defined)
 * 2. Vercel Preview environment (VERCEL_BRANCH_URL or VERCEL_URL)
 * 3. Vercel Production environment (VERCEL_PROJECT_PRODUCTION_URL)
 * 4. Local development fallback (http://localhost:3000)
 */
export function getBaseUrl(): string {
  // 1. Explicitly defined URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 2. Vercel Preview & Production fallbacks
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL_ENV === "preview") {
      const vercelUrl = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
      if (vercelUrl) {
        return `https://${vercelUrl}`;
      }
    }

    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
  }

  // 3. Local fallback
  return "http://localhost:3000";
}

/**
 * Generate an absolute URL by combining the base URL with a path
 * @param path - Optional path to append to the base URL (e.g., "/spaces/123")
 * @returns The complete absolute URL
 */
export function getAbsoluteUrl(path = ""): string {
  const baseUrl = getBaseUrl();
  try {
    return new URL(path, baseUrl).toString();
  } catch (e) {
    // Fallback to base URL if path is invalid
    console.error("Failed to construct URL:", e);
    return baseUrl;
  }
}
