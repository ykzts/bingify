/**
 * URL generation utilities with Vercel environment support
 */

/**
 * Get the base URL for the application following priority order:
 * 1. NEXT_PUBLIC_SITE_URL (explicitly defined)
 * 2. Vercel Preview environment (NEXT_PUBLIC_VERCEL_BRANCH_URL or NEXT_PUBLIC_VERCEL_URL)
 * 3. Vercel Production environment (NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL)
 * 4. Local development fallback (http://localhost:3000)
 */
export function getBaseUrl(): string {
  // 1. Explicitly defined URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 2. Vercel Preview & Production fallbacks
  if (process.env.NODE_ENV === "production") {
    const vercelEnv =
      process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;

    if (vercelEnv === "preview") {
      const vercelUrl =
        process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ||
        process.env.VERCEL_BRANCH_URL ||
        process.env.NEXT_PUBLIC_VERCEL_URL ||
        process.env.VERCEL_URL;
      if (vercelUrl) {
        return `https://${vercelUrl}`;
      }
    }

    const productionUrl =
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (productionUrl) {
      return `https://${productionUrl}`;
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

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const DANGEROUS_PROTOCOLS = /(?:javascript|data|vbscript|file|about):/i;
const CONTROL_CHARS_PATTERN = /[\r\n\t\0]/;

/**
 * Validate and sanitize a redirect path to prevent open redirect vulnerabilities
 * @param redirect - The redirect path to validate (from query parameter)
 * @param fallbackPath - The fallback path to use if validation fails (default: "/")
 * @returns A safe redirect path
 */
export function validateRedirectPath(
  redirect: string | null | undefined,
  fallbackPath = "/"
): string {
  let redirectPath =
    redirect && redirect.trim() !== "" ? redirect : fallbackPath;

  // Decode URI component to handle encoded characters
  try {
    redirectPath = decodeURIComponent(redirectPath);
  } catch {
    return fallbackPath;
  }

  // Check for path traversal patterns
  if (redirectPath.includes("..")) {
    return fallbackPath;
  }

  // Must start with single slash, reject protocol-relative URLs (//)
  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return fallbackPath;
  }

  // Check for protocol schemes
  if (PROTOCOL_PATTERN.test(redirectPath)) {
    return fallbackPath;
  }

  // Check for dangerous protocol handlers
  if (DANGEROUS_PROTOCOLS.test(redirectPath)) {
    return fallbackPath;
  }

  // Reject control characters and newlines
  if (CONTROL_CHARS_PATTERN.test(redirectPath)) {
    return fallbackPath;
  }

  // Normalize and validate using URL constructor with base URL
  try {
    const origin = getBaseUrl();
    const testUrl = new URL(redirectPath, origin);

    // Verify origin matches and protocol is safe
    if (
      testUrl.origin !== origin ||
      (testUrl.protocol !== "http:" && testUrl.protocol !== "https:")
    ) {
      return fallbackPath;
    }

    // Use the normalized pathname from the URL object
    return testUrl.pathname + testUrl.search + testUrl.hash;
  } catch {
    return fallbackPath;
  }
}
